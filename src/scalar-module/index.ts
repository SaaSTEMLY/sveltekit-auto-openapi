import { error, json, type RequestHandler } from "@sveltejs/kit";
import type { OpenAPIV3 } from "openapi-types";
import { defu } from "defu";
import { ScalarApiReference } from "./scalar-api-reference.ts";
import { OpenAPIObject, OpenAPISchema } from "./openapiValidationSchema.ts";
import z from "zod";
import type { RouteConfig } from "../types/index.ts";

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
   * @description If true, includes detailed docs schema in the response (bloat).
   * @default false
   */
  showDetailedDocsSchema?: boolean;
  /**
   * @description If showDetailedDocsSchema is true, set skipDocsValidation to true ti skips validation of the OpenAPI schema at runtime.
   * @default false
   */
  skipDocsValidation?: boolean;
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
    showDetailedDocsSchema: false,
    skipDocsValidation: false,
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
  const showDetailedDocsSchema =
    opts?.showDetailedDocsSchema ?? defaults.showDetailedDocsSchema;
  const skipDocsValidation =
    opts?.skipDocsValidation ?? defaults.skipDocsValidation;
  const openApiOpts = opts?.openApiOpts ?? defaults.openApiOpts;
  const overridePaths = opts?.overridePaths ?? defaults.overridePaths;
  const scalarDocPath = opts?.scalarDocPath ?? defaults.scalarDocPath;
  const scalarOpts = opts?.scalarOpts ?? defaults.scalarOpts;
  return {
    _config: {
      openapiOverride: {
        GET: {
          $pathParams: {
            $skipValidation: skipDocsValidation,
            schema: z
              .object({
                slug: z.union([
                  z.literal(openApiPath),
                  z.literal(scalarDocPath),
                ]),
              })
              .toJSONSchema(),
          },
          responses: {
            200: {
              description: "OpenAPI Schema",
              content: {
                "application/json": {
                  $skipValidation: skipDocsValidation,
                  schema: showDetailedDocsSchema
                    ? OpenAPISchema.toJSONSchema()
                    : (z
                        .looseObject({})
                        .toJSONSchema() as unknown as OpenAPIObject),
                },
                "text/html": {
                  $skipValidation: skipDocsValidation,
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

          // Lazy import: only load virtual module when actually serving the schema
          // This prevents circular dependencies during module initialization
          let openApiPaths: any;
          if (overridePaths) {
            openApiPaths = { paths: overridePaths };
          } else {
            const module = await import(
              "virtual:sveltekit-auto-openapi/schema-paths"
            );
            openApiPaths = module.default;
          }

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
