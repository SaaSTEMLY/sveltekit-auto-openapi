import { Project } from "ts-morph";
import type { ViteDevServer } from "vite";
import * as path from "path";
import { glob } from "glob";
import { loadModuleConfig } from "./ssr-loader.ts";
import {
  createCustomMerger,
  deduplicateArraysInOperation,
  extractPathParams,
  formatPath,
  inferFromAst,
  extractJsonSchema,
  convertSchemaToParameters,
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

export async function generate(
  server: ViteDevServer | null,
  rootDir: string,
  opts: {
    skipSchemaGeneration: boolean;
    skipValidationMapGeneration: boolean;
  }
) {
  // Prevent re-entry from circular imports during SSR loading
  if (_isGenerating) {
    debug(
      "⚠️ Skipping re-entrant generate call (circular dependency detected)"
    );
    return { openApiPaths: {}, validationMap: {} };
  }

  _isGenerating = true;
  try {
    return await _generateInternal(server, rootDir, opts);
  } finally {
    _isGenerating = false;
  }
}

// Cache AST project for better performance
let _cachedProject: Project | null = null;
let _cachedProjectRoot: string | null = null;

// Type definitions for internal use
type ValidationSchemaConfig = {
  schema: any;
  showErrorMessage?: boolean;
  skipValidation?: boolean;
};

type InputValidationConfig = {
  body?: ValidationSchemaConfig;
  query?: ValidationSchemaConfig;
  parameters?: ValidationSchemaConfig;
  headers?: ValidationSchemaConfig;
  cookies?: ValidationSchemaConfig;
};

type OutputValidationConfig = {
  body?: ValidationSchemaConfig;
  headers?: Record<string, ValidationSchemaConfig>;
  cookies?: ValidationSchemaConfig;
};

/** Helper: Extract validation configs from openapiOverride operation
 * Extracts custom $headers, $query, $pathParams, $cookies properties
 * and validation flags from requestBody and responses
 */
function extractValidationConfig(operation: any): {
  input?: InputValidationConfig;
  output?: Record<string, OutputValidationConfig>;
} {
  const input: InputValidationConfig = {};
  const output: Record<string, OutputValidationConfig> = {};

  // Extract input validation from custom properties
  if (operation.$headers) {
    input.headers = {
      schema: extractJsonSchema(operation.$headers.schema),
      showErrorMessage: operation.$headers.$showErrorMessage,
      skipValidation: operation.$headers.$skipValidation,
    };
  }

  if (operation.$query) {
    input.query = {
      schema: extractJsonSchema(operation.$query.schema),
      showErrorMessage: operation.$query.$showErrorMessage,
      skipValidation: operation.$query.$skipValidation,
    };
  }

  if (operation.$pathParams) {
    input.parameters = {
      schema: extractJsonSchema(operation.$pathParams.schema),
      showErrorMessage: operation.$pathParams.$showErrorMessage,
      skipValidation: operation.$pathParams.$skipValidation,
    };
  }

  if (operation.$cookies) {
    input.cookies = {
      schema: extractJsonSchema(operation.$cookies.schema),
      showErrorMessage: operation.$cookies.$showErrorMessage,
      skipValidation: operation.$cookies.$skipValidation,
    };
  }

  // Extract body validation from requestBody
  if (operation.requestBody?.content) {
    for (const [contentType, mediaType] of Object.entries(
      operation.requestBody.content
    )) {
      if (contentType === "application/json" && (mediaType as any).schema) {
        input.body = {
          schema: extractJsonSchema((mediaType as any).schema),
          showErrorMessage: (mediaType as any).$showErrorMessage,
          skipValidation: (mediaType as any).$skipValidation,
        };
        break; // Only process first JSON content type
      }
    }
  }

  // Extract output validation from responses
  if (operation.responses) {
    for (const [statusCode, response] of Object.entries(operation.responses)) {
      const resp = response as any;
      output[statusCode] = {};

      // Extract response body validation
      if (resp.content?.["application/json"]) {
        const jsonContent = resp.content["application/json"];
        if (jsonContent.schema) {
          output[statusCode].body = {
            schema: extractJsonSchema(jsonContent.schema),
            showErrorMessage: jsonContent.$showErrorMessage,
            skipValidation: jsonContent.$skipValidation,
          };
        }
      }

      // Extract response headers validation
      if (resp.headers) {
        output[statusCode].headers = {};
        for (const [headerName, headerObj] of Object.entries(resp.headers)) {
          const header = headerObj as any;
          if (header.schema) {
            output[statusCode].headers![headerName] = {
              schema: extractJsonSchema(header.schema),
              showErrorMessage: header.$showErrorMessage,
              skipValidation: header.$skipValidation,
            };
          }
        }
      }
    }
  }

  return {
    input: Object.keys(input).length > 0 ? input : undefined,
    output: Object.keys(output).length > 0 ? output : undefined,
  };
}

/** Helper: Clean OpenAPI operation for documentation
 * Converts custom validation properties to OpenAPI parameters and merges them
 * Priority: parameters > $headers > $query > $pathParams > $cookies
 */
function cleanOpenapiForDocs(operation: any): any {
  const cleaned = JSON.parse(JSON.stringify(operation)); // Deep clone

  // Convert and merge custom validation properties into parameters array
  const customParameters: any[] = [];

  // Convert each custom property to parameters (if schema exists)
  if (cleaned.$cookies?.schema) {
    const schema = extractJsonSchema(cleaned.$cookies.schema);
    const cookieParams = convertSchemaToParameters(schema, "cookie");
    customParameters.push(...cookieParams);
  }

  if (cleaned.$pathParams?.schema) {
    const schema = extractJsonSchema(cleaned.$pathParams.schema);
    const pathParams = convertSchemaToParameters(schema, "path");
    customParameters.push(...pathParams);
  }

  if (cleaned.$query?.schema) {
    const schema = extractJsonSchema(cleaned.$query.schema);
    const queryParams = convertSchemaToParameters(schema, "query");
    customParameters.push(...queryParams);
  }

  if (cleaned.$headers?.schema) {
    const schema = extractJsonSchema(cleaned.$headers.schema);
    const headerParams = convertSchemaToParameters(schema, "header");
    customParameters.push(...headerParams);
  }

  // Merge with existing parameters, giving priority to original parameters
  // For arrays of parameter objects, we need to deduplicate by name+in combination
  if (customParameters.length > 0) {
    const existingParams = cleaned.parameters || [];

    // Create a Set of existing parameter keys (name:in) for fast lookup
    const existingKeys = new Set(
      existingParams.map((p: any) => `${p.name}:${p.in}`)
    );

    // Add custom parameters only if they don't already exist
    const mergedParams = [...existingParams];
    for (const customParam of customParameters) {
      const key = `${customParam.name}:${customParam.in}`;
      if (!existingKeys.has(key)) {
        mergedParams.push(customParam);
      }
    }

    cleaned.parameters = mergedParams;
  }

  // Remove custom validation properties after conversion
  delete cleaned.$headers;
  delete cleaned.$query;
  delete cleaned.$pathParams;
  delete cleaned.$cookies;

  // Clean requestBody
  if (cleaned.requestBody?.content) {
    for (const contentType in cleaned.requestBody.content) {
      const mediaType = cleaned.requestBody.content[contentType];
      delete mediaType.$showErrorMessage;
      delete mediaType.$skipValidation;
    }
  }

  // Clean responses
  if (cleaned.responses) {
    for (const statusCode in cleaned.responses) {
      const response = cleaned.responses[statusCode];

      // Clean response content
      if (response.content) {
        for (const contentType in response.content) {
          const mediaType = response.content[contentType];
          delete mediaType.$showErrorMessage;
          delete mediaType.$skipValidation;
        }
      }

      // Clean response headers
      if (response.headers) {
        for (const headerName in response.headers) {
          const header = response.headers[headerName];
          delete header.$showErrorMessage;
          delete header.$skipValidation;
        }
      }
    }
  }

  return cleaned;
}

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
  rootDir: string,
  opts: {
    skipSchemaGeneration: boolean;
    skipValidationMapGeneration: boolean;
  }
) {
  // Early return if both generations are skipped
  if (opts.skipSchemaGeneration && opts.skipValidationMapGeneration) {
    debug("⚠️ Both schema and validation map generation skipped");
    return { openApiPaths: {}, validationMap: {} };
  }

  // A. Initialize validation map
  const validationMap: any = {};

  // 1. Initialize OpenAPI Skeleton
  const openApiPaths: any = {};

  // 2. Get or reuse AST Project (for Scenario C)
  // Only needed if schema generation is enabled (for AST inference)
  const project = opts.skipSchemaGeneration ? null : getASTProject(rootDir);

  // 3. Find all +server.ts files
  const files = glob.sync("src/routes/**/+server.ts", {
    cwd: rootDir,
    absolute: false,
    nodir: true,
  });

  for (const file of files) {
    try {
      const routePath = formatPath(file);
      const absPath = path.join(rootDir, file);

      // --- NEW: Extract Path Params ---
      const pathParams = opts.skipSchemaGeneration ? [] : extractPathParams(file);

      // Add file to AST project for analysis (or get cached if already added)
      // Only needed if schema generation is enabled
      let sourceFile = null;
      let exportedMethods: ReadonlyMap<string, any[]> = new Map();

      if (!opts.skipSchemaGeneration && project) {
        sourceFile = project.getSourceFile(absPath);
        if (!sourceFile) {
          sourceFile = project.addSourceFileAtPath(absPath);
        }
        // Detect exported HTTP methods
        exportedMethods = sourceFile.getExportedDeclarations();
      }

      // Prepare path object
      if (!opts.skipSchemaGeneration) {
        openApiPaths[routePath] = openApiPaths[routePath] || {};
      }

      // --- LOAD RUNTIME CONFIG (Scenario A & B) ---
      // Use universal loader that works in both dev and production
      let runtimeConfig: RouteConfig = {};

      const config = await loadModuleConfig(absPath, server, rootDir);
      if (config) {
        runtimeConfig = config;
        debug(`  ✓ Found _config in ${file}`);

        if (DEBUG) {
          if (runtimeConfig.openapiOverride) {
            debug(
              "    - openapiOverride methods:",
              Object.keys(runtimeConfig.openapiOverride)
            );
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

        // Check if method has config defined (openapiOverride)
        // @ts-expect-error -- Dynamic method key access on PathItemObject mapped type
        const hasConfig = !!runtimeConfig.openapiOverride?.[methodKeyUpper];

        // Skip if method is not implemented AND has no config
        if (!isImplemented && !hasConfig) return;

        // Initialize base operation with defaults (lowest priority)
        const baseOperation: any = {
          tags: ["Default"],
          parameters: pathParams.length > 0 ? [...pathParams] : [],
        };

        // Priority order: openapiOverride > openapiAST (Manual Override > AST Inference)
        // Note: Runtime configs use uppercase keys (GET, POST), OpenAPI paths use lowercase

        // --- Build Scenario C: TypeScript AST Inference (Lowest Priority - Fallback) ---
        // Only infer from AST if schema generation is enabled
        const openapiASTSchema: any = {};
        if (!opts.skipSchemaGeneration && sourceFile) {
          const inferred = inferFromAst(sourceFile, method);

          if (inferred.input) {
            openapiASTSchema.requestBody = {
              content: { "application/json": { schema: inferred.input } },
            };
          }

          if (inferred.responses) {
            openapiASTSchema.responses = inferred.responses;
          }
        }

        // --- Process openapiOverride: Extract Validation & Clean for Docs ---
        let openapiOverrideSchema: any = {};

        // @ts-expect-error -- Dynamic method key access on PathItemObject mapped type
        const openapiConfig = runtimeConfig.openapiOverride?.[methodKeyUpper];

        if (openapiConfig) {
          // Extract validation configuration from openapiOverride
          if (!opts.skipValidationMapGeneration) {
            const validationConfig = extractValidationConfig(openapiConfig);

            // Initialize route entry in validationMap if not exists
            if (!validationMap[routePath]) {
              validationMap[routePath] = {};
            }

            // Store validation config in validationMap
            validationMap[routePath][methodKeyUpper] = {
              modulePath: file,
              hasInput: !!validationConfig.input,
              hasOutput: !!validationConfig.output,
              isImplemented,
              input: validationConfig.input,
              output: validationConfig.output,
            };
          }

          // Clean the operation for OpenAPI docs (remove validation flags and custom properties)
          if (!opts.skipSchemaGeneration) {
            openapiOverrideSchema = cleanOpenapiForDocs(openapiConfig);
          }
        }

        // Only generate OpenAPI schema if not skipped
        if (!opts.skipSchemaGeneration) {
          // Merge scenarios with custom merger (openapiOverride > openapiAST > base priority)
          // Custom merger handles:
          // - Array replacement (not merging)
          // - Null value deletion
          let operation = createCustomMerger(
            openapiOverrideSchema,
            openapiASTSchema,
            baseOperation
          );

          // Clean up: remove null values and deduplicate arrays
          operation = deduplicateArraysInOperation(operation);

          openApiPaths[routePath][methodKey] = operation;
        }
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
