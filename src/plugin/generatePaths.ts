import { glob } from "glob";
import type { OpenAPIV3 } from "openapi-types";
import path from "path";
import { AstSchemaExtractor } from "./astExtractor.ts";
import type {
  OperationObjectWithValidation,
  ValidationSchemaConfig,
  MediaTypeWithValidation,
  ResponseObjectWithValidation,
} from "../types/routeConfig.ts";
import type { StandardSchemaV1 } from "@standard-schema/spec";
import { toJsonSchema } from "@standard-community/standard-json";

type DebugLog = (...args: unknown[]) => void;

type SchemaInput =
  | StandardSchemaV1<unknown>
  | OpenAPIV3.ReferenceObject
  | OpenAPIV3.SchemaObject;

export async function generateSchemaPaths(opts?: {
  skipAutoGenerateSchemaPaths?:
    | {
        fromAst?: boolean;
        fromConfig?: boolean;
      }
    | boolean;
  showDebugLogs?: boolean;
}): Promise<OpenAPIV3.PathsObject> {
  const defaultOpts = {
    skipAutoGenerateSchemaPaths: false,
    showDebugLogs: false,
  };
  const mergedOpts = {
    ...defaultOpts,
    ...opts,
  };

  const skipOptions = normalizeSkipOptions(
    mergedOpts.skipAutoGenerateSchemaPaths
  );
  const debugLog: DebugLog = mergedOpts.showDebugLogs
    ? (...args: unknown[]) => console.log("[sveltekit-auto-openapi]", ...args)
    : () => {};

  const paths: OpenAPIV3.PathsObject = {};

  try {
    // Find all +server.ts files
    const serverFiles = await glob("src/routes/**/+server.ts", {
      ignore: ["**/node_modules/**", "**/.svelte-kit/**"],
    });

    for (const file of serverFiles) {
      try {
        await processRouteFile(file, paths, skipOptions, debugLog);
      } catch (error) {
        console.error(
          `[sveltekit-auto-openapi] Error processing route ${file}:`,
          error
        );
        // Continue with other routes
      }
    }
  } catch (error) {
    console.error(
      "[sveltekit-auto-openapi] Error in generateSchemaPaths:",
      error
    );
  }

  return paths;
}

function normalizeSkipOptions(
  skipAutoGenerateSchemaPaths?:
    | {
        fromAst?: boolean;
        fromConfig?: boolean;
      }
    | boolean
): { fromAst: boolean; fromConfig: boolean } {
  if (skipAutoGenerateSchemaPaths === true) {
    return { fromAst: true, fromConfig: true };
  }
  if (
    skipAutoGenerateSchemaPaths === false ||
    skipAutoGenerateSchemaPaths === undefined
  ) {
    return { fromAst: false, fromConfig: false };
  }
  return {
    fromAst: skipAutoGenerateSchemaPaths.fromAst ?? false,
    fromConfig: skipAutoGenerateSchemaPaths.fromConfig ?? false,
  };
}

function convertSvelteKitPathToOpenAPI(svelteKitPath: string): string {
  return svelteKitPath.replace(/\[([^\]]+)\]/g, (_, param) => {
    // Handle rest parameters: [...slug] -> {slug}
    if (param.startsWith("...")) {
      return `{${param.slice(3)}}`;
    }
    // Handle optional parameters: [[lang]] -> {lang}
    if (param.startsWith("[") && param.endsWith("]")) {
      return `{${param.slice(1, -1)}}`;
    }
    // Regular parameters: [id] -> {id}
    return `{${param}}`;
  });
}

async function extractFromConfig(
  filePath: string
): Promise<{ schema: OpenAPIV3.PathItemObject | null; methods: string[] }> {
  try {
    const module = await import(path.resolve(process.cwd(), filePath));

    if (!module._config?.openapiOverride) {
      return { schema: null, methods: [] };
    }

    const pathItem: OpenAPIV3.PathItemObject = {};
    const methods: string[] = [];

    for (const [method, operation] of Object.entries(
      module._config.openapiOverride
    )) {
      const processedOp = await processOperation(
        operation as OperationObjectWithValidation
      );
      if (processedOp) {
        pathItem[method.toLowerCase() as Lowercase<OpenAPIV3.HttpMethods>] =
          processedOp;
        methods.push(method);
      }
    }

    return {
      schema: Object.keys(pathItem).length > 0 ? pathItem : null,
      methods,
    };
  } catch (error) {
    console.error(
      `[sveltekit-auto-openapi] Error extracting from config in ${filePath}:`,
      error
    );
    return { schema: null, methods: [] };
  }
}

async function extractFromAst(
  filePath: string,
  configuredMethods: string[],
  debugLog: DebugLog
): Promise<OpenAPIV3.PathItemObject | null> {
  try {
    const extractor = new AstSchemaExtractor(debugLog);
    return await extractor.extractFromFile(filePath, configuredMethods);
  } catch (error) {
    debugLog("[AST] Error extracting from AST:", error);
    return null;
  }
}

function mergeSchemas(
  configSchema: OpenAPIV3.PathItemObject | null,
  astSchema: OpenAPIV3.PathItemObject | null
): OpenAPIV3.PathItemObject | null {
  if (!configSchema && !astSchema) return null;
  if (!configSchema) return astSchema;
  if (!astSchema) return configSchema;

  // Merge both - config methods take precedence
  return { ...astSchema, ...configSchema };
}

async function processRouteFile(
  filePath: string,
  paths: OpenAPIV3.PathsObject,
  skipOptions: { fromAst: boolean; fromConfig: boolean },
  debugLog: DebugLog
): Promise<void> {
  const skipConfig = skipOptions.fromConfig;
  const skipAst = skipOptions.fromAst;

  // Phase 1: Extract from _config
  let configResult = {
    schema: null as OpenAPIV3.PathItemObject | null,
    methods: [] as string[],
  };

  if (!skipConfig) {
    configResult = await extractFromConfig(filePath);
  }

  // Phase 2: Extract from AST (for unconfigured methods)
  let astSchema: OpenAPIV3.PathItemObject | null = null;

  if (!skipAst) {
    astSchema = await extractFromAst(filePath, configResult.methods, debugLog);
  }

  // Phase 3: Merge schemas
  const finalSchema = mergeSchemas(configResult.schema, astSchema);

  if (finalSchema && Object.keys(finalSchema).length > 0) {
    const routePath = filePath
      .replace("src/routes/", "")
      .replace("/+server.ts", "");

    const openApiPath =
      "/" + (routePath ? convertSvelteKitPathToOpenAPI(routePath) : "");

    paths[openApiPath] = finalSchema;
  }
}

async function processOperation(operation: OperationObjectWithValidation) {
  try {
    const processed: OpenAPIV3.OperationObject = {
      responses: {},
    };

    // Add basic operation properties
    if (operation.summary) processed.summary = operation.summary;
    if (operation.description) processed.description = operation.description;
    if (operation.tags) processed.tags = operation.tags;
    if (operation.operationId) processed.operationId = operation.operationId;
    if (operation.deprecated) processed.deprecated = operation.deprecated;

    // Initialize parameters array
    processed.parameters = [];

    // Handle requestBody
    if (operation.requestBody) {
      // Process custom $ properties first to extract parameters
      if (operation.requestBody.$headers) {
        const headerParams = await extractHeaderParams(
          operation.requestBody.$headers
        );
        processed.parameters.push(...headerParams);
      }

      if (operation.requestBody.$query) {
        const queryParams = await extractQueryParams(
          operation.requestBody.$query
        );
        processed.parameters.push(...queryParams);
      }

      if (operation.requestBody.$pathParams) {
        const pathParams = await extractPathParams(
          operation.requestBody.$pathParams
        );
        processed.parameters.push(...pathParams);
      }

      if (operation.requestBody.$cookies) {
        const cookieParams = await extractCookieParams(
          operation.requestBody.$cookies
        );
        processed.parameters.push(...cookieParams);
      }

      // Process standard requestBody content
      if (operation.requestBody.content) {
        processed.requestBody = await processRequestBody(operation.requestBody);
      }
    }

    // Add any existing parameters from the operation
    if (operation.parameters) {
      processed.parameters.push(...operation.parameters);
    }

    // Remove parameters array if empty
    if (processed.parameters.length === 0) {
      delete processed.parameters;
    }

    // Handle responses
    if (operation.responses) {
      processed.responses = await processResponses(operation.responses);
    }

    return processed;
  } catch (error) {
    console.error(
      "[sveltekit-auto-openapi] Error processing operation:",
      error
    );
    return null;
  }
}

async function processRequestBody(
  requestBody: OperationObjectWithValidation["requestBody"]
) {
  const processed: OpenAPIV3.RequestBodyObject = {
    content: {},
  };

  if (!requestBody) {
    return processed;
  }

  if (requestBody.description) {
    processed.description = requestBody.description;
  }

  if (requestBody.required !== undefined) {
    processed.required = requestBody.required;
  }

  // Process content types
  for (const [contentType, mediaType] of Object.entries(
    requestBody.content || {}
  )) {
    const mt = mediaType as MediaTypeWithValidation;
    const processedMediaType: OpenAPIV3.MediaTypeObject = {};

    if (mt.schema) {
      processedMediaType.schema = await convertToJSONSchema(mt.schema);
    }

    if (mt.example) processedMediaType.example = mt.example;
    if (mt.examples) processedMediaType.examples = mt.examples;
    if (mt.encoding) processedMediaType.encoding = mt.encoding;

    processed.content[contentType] = processedMediaType;
  }

  return processed;
}

async function processResponses(
  responses: OperationObjectWithValidation["responses"]
) {
  const processed: OpenAPIV3.ResponsesObject = {};

  if (!responses) {
    return processed;
  }

  for (const [statusCode, response] of Object.entries(responses)) {
    if (!response) continue;

    const resp = response as ResponseObjectWithValidation;
    const processedResponse: OpenAPIV3.ResponseObject = {
      description: resp.description || "Response",
    };

    // Process content types
    if (resp.content) {
      processedResponse.content = {};
      for (const [contentType, mediaType] of Object.entries(resp.content)) {
        const mt = mediaType as MediaTypeWithValidation;
        const processedMediaType: OpenAPIV3.MediaTypeObject = {};

        if (mt.schema) {
          processedMediaType.schema = await convertToJSONSchema(mt.schema);
        }

        if (mt.example) processedMediaType.example = mt.example;
        if (mt.examples) processedMediaType.examples = mt.examples;

        processedResponse.content[contentType] = processedMediaType;
      }
    }

    // Process headers (if any)
    if (resp.headers) {
      processedResponse.headers = resp.headers;
    }

    // Process links (if any)
    if (resp.links) {
      processedResponse.links = resp.links;
    }

    processed[statusCode] = processedResponse;
  }

  return processed;
}

async function extractHeaderParams(headersConfig: ValidationSchemaConfig) {
  const params: OpenAPIV3.ParameterObject[] = [];

  if (!headersConfig.schema) return params;

  const schema = await convertToJSONSchema(headersConfig.schema);

  // Extract properties from schema
  if (schema && typeof schema === "object" && "properties" in schema) {
    const properties = schema.properties as Record<
      string,
      OpenAPIV3.SchemaObject
    >;
    const required = (schema.required as string[]) || [];

    for (const [name, propSchema] of Object.entries(properties)) {
      params.push({
        name,
        in: "header",
        required: required.includes(name),
        schema: propSchema,
      });
    }
  }

  return params;
}

async function extractQueryParams(queryConfig: ValidationSchemaConfig) {
  const params: OpenAPIV3.ParameterObject[] = [];

  if (!queryConfig.schema) return params;

  const schema = await convertToJSONSchema(queryConfig.schema);

  // Extract properties from schema
  if (schema && typeof schema === "object" && "properties" in schema) {
    const properties = schema.properties as Record<
      string,
      OpenAPIV3.SchemaObject
    >;
    const required = (schema.required as string[]) || [];

    for (const [name, propSchema] of Object.entries(properties)) {
      params.push({
        name,
        in: "query",
        required: required.includes(name),
        schema: propSchema,
      });
    }
  }

  return params;
}

async function extractPathParams(pathParamsConfig: ValidationSchemaConfig) {
  const params: OpenAPIV3.ParameterObject[] = [];

  if (!pathParamsConfig.schema) return params;

  const schema = await convertToJSONSchema(pathParamsConfig.schema);

  // Extract properties from schema
  if (schema && typeof schema === "object" && "properties" in schema) {
    const properties = schema.properties as Record<
      string,
      OpenAPIV3.SchemaObject
    >;

    for (const [name, propSchema] of Object.entries(properties)) {
      params.push({
        name,
        in: "path",
        required: true, // Path parameters are always required in OpenAPI
        schema: propSchema,
      });
    }
  }

  return params;
}

async function extractCookieParams(cookiesConfig: ValidationSchemaConfig) {
  const params: OpenAPIV3.ParameterObject[] = [];

  if (!cookiesConfig.schema) return params;

  const schema = await convertToJSONSchema(cookiesConfig.schema);

  // Extract properties from schema
  if (schema && typeof schema === "object" && "properties" in schema) {
    const properties = schema.properties as Record<
      string,
      OpenAPIV3.SchemaObject
    >;
    const required = (schema.required as string[]) || [];

    for (const [name, propSchema] of Object.entries(properties)) {
      params.push({
        name,
        in: "cookie",
        required: required.includes(name),
        schema: propSchema,
      });
    }
  }

  return params;
}

async function convertToJSONSchema(schema: SchemaInput) {
  if (!schema) {
    return {};
  }

  // Check if it's StandardSchema (compliant with @standard-schema/spec)
  if ("~standard" in schema) {
    try {
      const jsonSchema = await toJsonSchema(schema);
      return jsonSchema as OpenAPIV3.SchemaObject;
    } catch (e) {
      console.warn(
        "[sveltekit-auto-openapi] Standard Schema conversion failed:",
        e
      );
      return {};
    }
  }

  // Already JSON Schema or Reference - return as is but remove custom $ properties
  if (schema && typeof schema === "object") {
    // Handle Reference objects
    if ("$ref" in schema) {
      return schema as OpenAPIV3.ReferenceObject;
    }

    // Handle Schema objects - clean validation flags
    const cleaned = { ...(schema as OpenAPIV3.SchemaObject) };
    // Remove validation flags that are not part of JSON Schema
    if ("$_skipValidation" in cleaned) {
      delete (cleaned as Record<string, unknown>).$_skipValidation;
    }
    if ("$_returnDetailedError" in cleaned) {
      delete (cleaned as Record<string, unknown>).$_returnDetailedError;
    }
    return cleaned;
  }

  return {};
}
