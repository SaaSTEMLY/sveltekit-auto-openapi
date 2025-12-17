import { Project } from "ts-morph";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { ViteDevServer } from "vite";
import * as path from "path";
import { glob } from "glob";
import { loadModuleConfig } from "./ssr-loader.ts";
import {
  convertSchemaToParameters,
  createCustomMerger,
  deduplicateArraysInOperation,
  extractPathParams,
  formatPath,
  getStatusDescription,
  inferFromAst,
  standardSchemaToOpenApi,
} from "./helpers.ts";
import { RouteConfig } from "../scalar-module/index.ts";

// Global flag to prevent re-entry during SSR module loading
// This prevents infinite loops when route files import the virtual module
let _isGenerating = false;

// Debug mode controlled by environment variable
const DEBUG = process.env.DEBUG_OPENAPI === "true";

function debug(...args: any[]) {
  if (DEBUG) {
    console.log(...args);
  }
}

export async function generate(server: ViteDevServer | null, rootDir: string) {
  // Prevent re-entry from circular imports during SSR loading
  if (_isGenerating) {
    debug("⚠️ Skipping re-entrant generate call (circular dependency detected)");
    return { openApiPaths: {}, validationMap: {} };
  }

  _isGenerating = true;
  try {
    return await _generateInternal(server, rootDir);
  } finally {
    _isGenerating = false;
  }
}

// Cache AST project for better performance
let _cachedProject: Project | null = null;
let _cachedProjectRoot: string | null = null;

function getASTProject(rootDir: string): Project {
  // Reuse cached project if root hasn't changed
  if (_cachedProject && _cachedProjectRoot === rootDir) {
    return _cachedProject;
  }

  _cachedProject = new Project({
    tsConfigFilePath: path.join(rootDir, "tsconfig.json"),
    skipAddingFilesFromTsConfig: true,
  });
  _cachedProjectRoot = rootDir;

  return _cachedProject;
}

async function _generateInternal(
  server: ViteDevServer | null,
  rootDir: string
) {
  // A. Initialize validation map
  const validationMap: any = {};

  // 1. Initialize OpenAPI Skeleton
  const openApiPaths: any = {};

  // 2. Get or reuse AST Project (for Scenario C)
  const project = getASTProject(rootDir);

  // 3. Find all +server.ts files
  const files = glob.sync("src/routes/**/+server.ts", {
    cwd: rootDir,
    absolute: false,
    nodir: true
  });

  for (const file of files) {
    try {
      const routePath = formatPath(file);
      const absPath = path.join(rootDir, file);

      // --- NEW: Extract Path Params ---
      const pathParams = extractPathParams(file);

      // Add file to AST project for analysis (or get cached if already added)
      let sourceFile = project.getSourceFile(absPath);
      if (!sourceFile) {
        sourceFile = project.addSourceFileAtPath(absPath);
      }

      // Prepare path object
      openApiPaths[routePath] = openApiPaths[routePath] || {};

      // Detect exported HTTP methods
      const exportedMethods = sourceFile.getExportedDeclarations();

    // --- LOAD RUNTIME CONFIG (Scenario A & B) ---
    // Use universal loader that works in both dev and production
    let runtimeConfig: RouteConfig = {};

    const config = await loadModuleConfig(absPath, server, rootDir);
    if (config) {
      runtimeConfig = config;
      debug(`  ✓ Found _config in ${file}`);

      if (DEBUG) {
        if (runtimeConfig.standardSchema) {
          debug("    - standardSchema methods:", Object.keys(runtimeConfig.standardSchema));
        }
        if (runtimeConfig.openapiOverride) {
          debug("    - openapiOverride methods:", Object.keys(runtimeConfig.openapiOverride));
        }
      }
    } else {
      debug(`  ℹ No _config found in ${file}, using AST inference only`);
    }

    // Iterate over standard HTTP methods
    ["GET", "POST", "PUT", "DELETE", "PATCH"].forEach((method) => {
      const methodKey = method.toLowerCase();
      const methodKeyUpper = method; // Keep uppercase for runtime config lookups

      // Check if method is actually implemented (exported)
      const isImplemented = exportedMethods.has(method);

      // Check if method has config defined (standardSchema or openapiOverride)
      const hasConfig = !!(
        runtimeConfig.standardSchema?.[methodKeyUpper] ||
        // @ts-expect-error -- Dynamic method key access on PathItemObject mapped type
        runtimeConfig.openapiOverride?.[methodKeyUpper]
      );

      // Skip if method is not implemented AND has no config
      if (!isImplemented && !hasConfig) return;

      // Initialize base operation with defaults (lowest priority)
      const baseOperation: any = {
        tags: ["Default"],
        parameters: pathParams.length > 0 ? [...pathParams] : [],
      };

      // Priority order: A > B > C (Manual Override > Zod Validation > AST Inference)
      // Note: Runtime configs use uppercase keys (GET, POST), OpenAPI paths use lowercase
      // Using defu for proper deep merging with fallback

      // --- Build Scenario C: TypeScript AST Inference (Lowest Priority - Fallback) ---
      const scenarioC: any = {};
      const inferred = inferFromAst(sourceFile, method);

      if (inferred.input) {
        scenarioC.requestBody = {
          content: { "application/json": { schema: inferred.input } },
        };
      }

      if (inferred.responses) {
        scenarioC.responses = inferred.responses;
      }

      // --- Build Scenario B: Zod Validation (Mid Priority) ---
      const scenarioB: any = {};

      if (runtimeConfig.standardSchema?.[methodKeyUpper]) {
        const val = runtimeConfig.standardSchema[methodKeyUpper];

        // Initialize route entry in validationMap if not exists
        if (!validationMap[routePath]) {
          validationMap[routePath] = {};
        }

        // Store validation metadata and module path
        validationMap[routePath][methodKeyUpper] = {
          modulePath: file, // Relative path from project root
          hasInput: !!val.input,
          hasOutput: !!val.output,
          isImplemented, // Track if method is actually exported
        };

        // Input Schema - handle RequestOptions structure
        if (val.input?.body) {
          // @ts-expect-error -- ZodSchema type
          let jsonSchema = zodToJsonSchema(val.input.body, {
            target: "openApi3",
          });

          // Fallback for Zod v4 standard schemas (zodToJsonSchema compatibility issue)
          if (Object.keys(jsonSchema).length === 0) {
            jsonSchema = standardSchemaToOpenApi(val.input.body);
          }

          scenarioB.requestBody = {
            content: {
              "application/json": { schema: jsonSchema },
            },
          };
        }

        // Handle input.query - convert to OpenAPI query parameters
        if (val.input?.query) {
          // @ts-expect-error -- ZodSchema type
          let querySchema = zodToJsonSchema(val.input.query, {
            target: "openApi3",
          });

          // Fallback for Zod v4 standard schemas
          if (Object.keys(querySchema).length === 0) {
            querySchema = standardSchemaToOpenApi(val.input.query);
          }

          const queryParams = convertSchemaToParameters(querySchema, "query");
          if (!scenarioB.parameters) scenarioB.parameters = [];
          scenarioB.parameters.push(...queryParams);
        }

        // Handle input.parameters - convert to OpenAPI path parameters
        if (val.input?.parameters) {
          // @ts-expect-error -- ZodSchema type
          let paramsSchema = zodToJsonSchema(val.input.parameters, {
            target: "openApi3",
          });

          // Fallback for Zod v4 standard schemas
          if (Object.keys(paramsSchema).length === 0) {
            paramsSchema = standardSchemaToOpenApi(val.input.parameters);
          }

          const pathParams = convertSchemaToParameters(paramsSchema, "path");
          if (!scenarioB.parameters) scenarioB.parameters = [];
          scenarioB.parameters.push(...pathParams);
        }

        // Handle input.headers - convert to OpenAPI header parameters
        if (val.input?.headers) {
          // @ts-expect-error -- ZodSchema type
          let headersSchema = zodToJsonSchema(val.input.headers, {
            target: "openApi3",
          });

          // Fallback for Zod v4 standard schemas
          if (Object.keys(headersSchema).length === 0) {
            headersSchema = standardSchemaToOpenApi(val.input.headers);
          }

          const headerParams = convertSchemaToParameters(
            headersSchema,
            "header"
          );
          if (!scenarioB.parameters) scenarioB.parameters = [];
          scenarioB.parameters.push(...headerParams);
        }

        // Handle input.cookies - convert to OpenAPI cookie parameters
        if (val.input?.cookies) {
          // @ts-expect-error -- ZodSchema type
          let cookiesSchema = zodToJsonSchema(val.input.cookies, {
            target: "openApi3",
          });

          // Fallback for Zod v4 standard schemas
          if (Object.keys(cookiesSchema).length === 0) {
            cookiesSchema = standardSchemaToOpenApi(val.input.cookies);
          }

          const cookieParams = convertSchemaToParameters(
            cookiesSchema,
            "cookie"
          );
          if (!scenarioB.parameters) scenarioB.parameters = [];
          scenarioB.parameters.push(...cookieParams);
        }

        // Output Schema - handle ResponseOptions structure with status codes
        if (val.output) {
          scenarioB.responses = {};

          // Iterate through each status code in the output config
          for (const [statusCode, responseConfig] of Object.entries(
            val.output
          )) {
            // Type guard to ensure responseConfig has the expected shape
            if (responseConfig && typeof responseConfig === "object") {
              const response: any = {
                description: getStatusDescription(statusCode),
              };

              // Handle response body
              if ("body" in responseConfig && responseConfig.body) {
                let jsonSchema = zodToJsonSchema(responseConfig.body as any, {
                  target: "openApi3",
                });

                // Fallback for Zod v4 standard schemas
                if (Object.keys(jsonSchema).length === 0) {
                  jsonSchema = standardSchemaToOpenApi(
                    responseConfig.body as any
                  );
                }

                response.content = {
                  "application/json": { schema: jsonSchema },
                };
              }

              // Handle response headers
              if ("headers" in responseConfig && responseConfig.headers) {
                let headersSchema = zodToJsonSchema(
                  responseConfig.headers as any,
                  {
                    target: "openApi3",
                  }
                ) as any;

                // Fallback for Zod v4 standard schemas
                if (Object.keys(headersSchema).length === 0) {
                  headersSchema = standardSchemaToOpenApi(
                    responseConfig.headers as any
                  );
                }

                // Convert to OpenAPI headers format
                if (
                  headersSchema.type === "object" &&
                  headersSchema.properties
                ) {
                  response.headers = {};
                  for (const [headerName, headerSchema] of Object.entries(
                    headersSchema.properties
                  )) {
                    response.headers[headerName] = {
                      schema: headerSchema,
                      description: (headerSchema as any).description,
                    };
                  }
                }
              }

              // Note: OpenAPI doesn't have a standard way to document cookies in responses
              // Cookies are typically set via Set-Cookie header
              // We could add them to headers if needed
              if ("cookies" in responseConfig && responseConfig.cookies) {
                // Add Set-Cookie to headers
                if (!response.headers) response.headers = {};
                response.headers["Set-Cookie"] = {
                  schema: { type: "string" },
                  description: "Cookies set by this response",
                };
              }

              scenarioB.responses[statusCode] = response;
            }
          }

          // If no responses were added but output config exists, use inferred or default
          if (Object.keys(scenarioB.responses).length === 0) {
            const statusCodes =
              inferred.responses && Object.keys(inferred.responses).length > 0
                ? Object.keys(inferred.responses)
                : ["200"];

            // Use a generic object schema as fallback
            for (const statusCode of statusCodes) {
              scenarioB.responses[statusCode] = {
                description: getStatusDescription(statusCode),
                content: {
                  "application/json": { schema: { type: "object" } },
                },
              };
            }
          }
        }
      }

      // --- Build Scenario A: Manual Override (Highest Priority) ---
      // @ts-expect-error -- Dynamic method key access on PathItemObject mapped type
      const scenarioA = runtimeConfig.openapiOverride?.[methodKeyUpper] || {};

      // Merge all scenarios with custom merger (A > B > C > base priority)
      // Custom merger handles:
      // - Array replacement (not merging)
      // - Null value deletion
      let operation = createCustomMerger(
        scenarioA,
        scenarioB,
        scenarioC,
        baseOperation
      );

      // Clean up: remove null values and deduplicate arrays
      operation = deduplicateArraysInOperation(operation);

      openApiPaths[routePath][methodKey] = operation;
    });
    } catch (error) {
      console.error(`[OpenAPI] Error processing route file ${file}:`, error);
      // Continue processing other files even if one fails
    }
  }

  // Debug: Show final generated paths
  if (DEBUG) {
    console.log("\n📊 Generated OpenAPI Paths:");
    for (const [path, methods] of Object.entries(openApiPaths)) {
      console.log(`\n  ${path}:`);
      for (const [method, operation] of Object.entries(methods as any)) {
        const op = operation as any;
        console.log(`    ${method.toUpperCase()}:`);
        console.log(`      - summary: ${op.summary || "(none)"}`);
        console.log(`      - parameters: ${op.parameters?.length || 0}`);
        console.log(
          `      - responses: ${
            Object.keys(op.responses || {}).join(", ") || "(none)"
          }`
        );
        console.log(`      - requestBody: ${op.requestBody ? "yes" : "no"}`);
      }
    }
    console.log("");
  }

  return { openApiPaths, validationMap };
}
