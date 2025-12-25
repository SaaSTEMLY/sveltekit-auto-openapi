import { error, json, type RequestHandler } from "@sveltejs/kit";
import type { OpenAPIV3 } from "openapi-types";
import { defu } from "defu";
import { ScalarApiReference } from "./scalar-api-reference.ts";
import { OpenAPISchema } from "./openapiValidationSchema.ts";
import type { RouteConfig } from "../types/index.ts";

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
   * @default true
   */
  skipDocsValidation?: boolean;
  /**
   * @description Options for generating the OpenAPI schema. Settings here will override defaults.
   * @default { openapi: "3.0.0", info: { title: "API Documentation", version: "1.0.0" } }
   */
  openApiOpts?: Omit<OpenAPIV3.Document, "paths"> & {
    paths?: OpenAPIV3.PathsObject;
  };
  /**
   * @description Modify existing paths or add new paths to the generated schema.
   * @default undefined
   */
  mergePaths?: OpenAPIV3.PathsObject;
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
   * @default undefined
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
    skipDocsValidation: true,
    openApiOpts: {
      openapi: "3.0.0",
      info: {
        title: "API Documentation",
        version: "1.0.0",
      },
    } as OpenAPIV3.Document,
    mergePaths: undefined,

    disableScalar: false,
    scalarDocPath: "scalar",
    scalarOpts: undefined,
  } satisfies typeof opts;
  const {
    openApiPath,
    showDetailedDocsSchema,
    skipDocsValidation,
    openApiOpts,
    mergePaths,
    scalarDocPath,
    scalarOpts,
  } = { ...defaults, ...opts };

  return {
    _config: {
      openapiOverride: {
        GET: {
          parameters: [
            {
              name: "slug",
              in: "path",
              required: true,
              schema: {
                type: "string",
                enum: [openApiPath, scalarDocPath],
              },
            },
          ],
          responses: {
            200: {
              description: "OpenAPI Schema",
              content: {
                "application/json": {
                  $_skipValidation: skipDocsValidation,
                  schema: showDetailedDocsSchema
                    ? OpenAPISchema
                    : {
                        type: "object",
                        properties: {},
                        additionalProperties: {},
                      },
                },
                "text/html": {
                  $_skipValidation: skipDocsValidation,
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
          let openApiPaths: OpenAPIV3.Document["paths"];
          if (openApiOpts.paths) {
            openApiPaths = { paths: mergePaths };
          } else {
            const module = await import(
              "virtual:sveltekit-auto-openapi/schema-paths"
            );
            openApiPaths = defu(mergePaths ?? {}, module.default);
          }

          const mergedSchema = defu(openApiOpts ?? {}, {
            paths: openApiPaths,
          }) as OpenAPIV3.Document;

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
