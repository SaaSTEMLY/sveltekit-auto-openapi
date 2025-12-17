import { error, json, type RequestHandler } from "@sveltejs/kit";
import type { OpenAPIV3 } from "openapi-types";
import { defu } from "defu";
import type { ZodType } from "zod";
import openApiSchemaPaths from "virtual:sveltekit-auto-openapi/schema-paths";
import type { StandardSchemaV1 } from "@standard-schema/spec";
import { ScalarApiReference } from "./scalar-api-reference.ts";

type Digit = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";
type HttpStatusCodeStart = "1" | "2" | "3" | "4" | "5";

type SpecificStatusCode = `${HttpStatusCodeStart}${Digit}${Digit}`;

type WildcardStatusCode = `${HttpStatusCodeStart}XX`;

export type OpenApiResponseKey =
  | SpecificStatusCode
  | WildcardStatusCode
  | "default";

export type RequestOptions = {
  body?: StandardSchemaV1 | ZodType<any>;
  query?: StandardSchemaV1 | ZodType<any>;
  parameters?: StandardSchemaV1 | ZodType<any>;
  headers?: StandardSchemaV1 | ZodType<any>;
  cookies?: StandardSchemaV1 | ZodType<any>;
};

export type ResponseOptions = Partial<
  Record<
    OpenApiResponseKey,
    {
      body?: StandardSchemaV1 | ZodType<any>;
      headers?: StandardSchemaV1 | ZodType<any>;
      cookies?: StandardSchemaV1 | ZodType<any>;
    }
  >
>;

export interface ValidationConfig {
  input?: RequestOptions;
  output?: ResponseOptions;
}

type PathItemObject<T extends {} = {}> = {
  $ref?: string;
  summary?: string;
  description?: string;
  servers?: OpenAPIV3.ServerObject[];
  parameters?: (OpenAPIV3.ReferenceObject | OpenAPIV3.ParameterObject)[];
} & {
  [method in Uppercase<OpenAPIV3.HttpMethods>]?: OpenAPIV3.OperationObject<T>;
};

export interface RouteConfig {
  openapiOverride?: PathItemObject; // e.g., 'post', 'get'
  standardSchema?: Record<string, ValidationConfig>;
}

/**
 * @property disableOpenApi - If true, disables the OpenAPI schema endpoint.
 */
interface ScalarModuleOptions {
  /**
   * @description If true, disables the OpenAPI schema endpoint.
   * @default false
   */
  disableOpenApi?: boolean;
  /**
   * @description The path at which to serve the OpenAPI schema.
   * @default "openapi.json"
   */
  openApiPath?: string;
  /**
   * @description Options for generating the OpenAPI schema.
   * @default {}
   */
  openApiOpts?: Omit<OpenAPIV3.Document, "paths"> & {
    paths?: OpenAPIV3.PathsObject;
  };
  /**
   * @description Override the generated OpenAPI paths.
   * @default undefined
   */
  overridePaths?: OpenAPIV3.PathsObject;
  /**
   * @description If true, disables the Scalar API documentation endpoint.
   * @default false
   */
  disableScalar?: boolean;
  /**
   * @description The path at which to serve the Scalar API documentation.
   * @default "scalar"
   */
  scalarDocPath?: string;
  /**
   * @description Options for the Scalar API Reference.
   * @default {}
   */
  scalarOpts?: Parameters<typeof ScalarApiReference>[0];
}

/**
 * @description A SvelteKit module that serves OpenAPI schema and Scalar API documentation.
 *
 * @param opts Configuration options for the module.
 * @returns An object containing the SvelteKit request handler and configuration.
 *
 * @example
 * ```ts
 * // src/routes/[slug]/+server.ts
 * import ScalarModule from "sveltekit-auto-openapi/scalar-module";
 *
 * const scalarModule = ScalarModule({
 *   disableOpenApi: false,
 *   openApiPath: "openapi.json",
 *   openApiOpts: {
 *     openapi: "3.0.0",
 *     info: {
 *       title: "My API",
 *       version: "1.0.0",
 *     },
 *   },
 *   disableScalar: false,
 *   scalarDocPath: "scalar",
 * });
 *
 * export const _config = scalarModule._config;
 * export const GET = scalarModule.GET;
 * ```
 */
const ScalarModule = (opts?: ScalarModuleOptions) => {
  const defaults = {
    disableOpenApi: false,
    openApiPath: "openapi.json",
    openApiOpts: {
      openapi: "3.0.0",
      info: {
        title: "API Documentation",
        version: "1.0.0",
      },
      paths: {},
    },
    overridePaths: undefined,
    disableScalar: false,
    scalarDocPath: "scalar",
    scalarOpts: {},
  } satisfies typeof opts;
  const openApiPath = opts?.openApiPath ?? defaults.openApiPath;
  const openApiOpts = opts?.openApiOpts ?? defaults.openApiOpts;
  const overridePaths = opts?.overridePaths ?? defaults.overridePaths;
  const scalarDocPath = opts?.scalarDocPath ?? defaults.scalarDocPath;
  const scalarOpts = opts?.scalarOpts ?? defaults.scalarOpts;
  return {
    _config: {
      openapiOverride: {
        GET: {
          parameters: [],
          responses: {
            200: {
              description: "OpenAPI Schema",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      openapi: {
                        type: "string",
                      },
                      info: {
                        type: "object",
                        properties: {
                          title: {
                            type: "string",
                          },
                          description: {
                            type: "object",
                          },
                          termsOfService: {
                            type: "object",
                          },
                          contact: {
                            type: "object",
                          },
                          license: {
                            type: "object",
                          },
                          version: {
                            type: "string",
                          },
                        },
                        required: ["title", "version"],
                        additionalProperties: false,
                      },
                      servers: {
                        type: "object",
                      },
                      paths: {
                        type: "object",
                        properties: {},
                        additionalProperties: false,
                      },
                      components: {
                        type: "object",
                      },
                      security: {
                        type: "object",
                      },
                      tags: {
                        type: "object",
                      },
                      externalDocs: {
                        type: "object",
                      },
                      "x-express-openapi-additional-middleware": {
                        type: "object",
                      },
                      "x-express-openapi-validation-strict": {
                        type: "object",
                      },
                    },
                    required: ["openapi", "info", "paths"],
                    additionalProperties: false,
                  },
                },
                "text/html": {
                  schema: {
                    type: "string",
                    format: "html",
                    description: "The Scalar API Documentation HTML page",
                    example:
                      "<!DOCTYPE html><html><body><h1>Hello</h1></body></html>",
                  },
                },
              },
            },
          },
        },
      },
    } satisfies RouteConfig,
    GET: (async (request) => {
      switch (request.params.slug) {
        case openApiPath: {
          if (opts?.disableOpenApi) {
            throw error(404, "Not found");
          }
          const openApiPaths = overridePaths
            ? { paths: overridePaths }
            : openApiSchemaPaths;

          const mergedSchema = defu(openApiOpts ?? {}, {
            paths: openApiPaths,
          }) as OpenAPIV3.Document<object>;

          return json(mergedSchema);
        }
        case scalarDocPath: {
          if (opts?.disableScalar) {
            throw error(404, "Not found");
          }
          const routeBasePath =
            (request.route.id?.replace("/[slug]", "") ?? "") + "/";

          // Dynamic import to avoid SSR issues with @scalar/sveltekit's export conditions
          const render = ScalarApiReference({
            url: routeBasePath + openApiPath,
            ...scalarOpts,
          });
          return render();
        }
      }

      error(404, "Not found");
    }) satisfies RequestHandler,
  };
};

export default ScalarModule;
