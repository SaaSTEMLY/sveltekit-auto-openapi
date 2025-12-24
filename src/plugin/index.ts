import type { PluginOption } from "vite";
import { _syncAllTypes, _syncFileTypes } from "../sync-helper/sync.ts";

// Virtual module IDs following Vite best practices
const SCHEMA_PATHS_MODULE_ID = "virtual:sveltekit-auto-openapi/schema-paths";
const RESOLVED_SCHEMA_PATHS_ID = "\0" + SCHEMA_PATHS_MODULE_ID;

interface PluginOpts {
  /**
   * @description If true, enables debug logging for the plugin.
   * @default false
   */
  showDebugLogs?: boolean;

  /**
   * @description If true, skips automatic generation of schemaPaths from route spec.
   * @default false
   */
  skipAutoGenerateSchemaPaths?:
    | {
        fromAst?: boolean;
        fromConfig?: boolean;
      }
    | boolean;

  /**
   * @description If true, skips automatic validation of requests and responses based on the OpenAPI schemaPaths.
   * @default false
   */
  skipAutoValidation?: boolean;

  /**
   * @description Default value for the `$_skipValidation` flag in route configs.
   * @default undefined
   */
  skipValidationDefault?:
    | {
        request?:
          | {
              headers?: boolean;
              query?: boolean;
              pathParams?: boolean;
              body?: boolean;
              cookies?: boolean;
            }
          | boolean;
        response?:
          | {
              headers?: boolean;
              body?: boolean;
              cookies?: boolean;
            }
          | boolean;
      }
    | boolean;
  /**
   * @description Default value for the `$_returnDetailedError` flag in route configs.
   * @default undefined
   */
  returnsDetailedErrorDefault?:
    | {
        request?:
          | {
              headers?: boolean;
              query?: boolean;
              pathParams?: boolean;
              body?: boolean;
              cookies?: boolean;
            }
          | boolean;
        response?:
          | {
              headers?: boolean;
              body?: boolean;
              cookies?: boolean;
            }
          | boolean;
      }
    | boolean;
}

/**
 *
 * @param opts
 * @returns
 */
export default function svelteOpenApi(opts?: PluginOpts) {
  const defaultOpts = {
    showDebugLogs: false,
    skipAutoGenerateSchemaPaths: false,
    skipAutoValidation: false,
    skipValidationDefault: undefined,
    returnsDetailedErrorDefault: undefined,
  };
  const {
    showDebugLogs,
    skipAutoGenerateSchemaPaths,
    skipAutoValidation,
    skipValidationDefault,
    returnsDetailedErrorDefault,
  } = {
    ...defaultOpts,
    ...opts,
  };

  let schemaPathsCache: Record<string, any> | null = null;

  const debugLog = (...args: Parameters<(typeof console)["log"]>) => {
    if (showDebugLogs) {
      console.log("[sveltekit-auto-openapi]", ...args);
    }
  };

  return {
    name: "sveltekit-auto-openapi",

    config(config, env) {
      // Ensure virtual modules are handled in SSR builds
      return {
        ssr: {
          noExternal: ['sveltekit-auto-openapi'],
        },
        optimizeDeps: {
          exclude: ['sveltekit-auto-openapi'],
        },
      };
    },

    // Resolve virtual module for schemaPaths
    resolveId(id) {
      if (id === SCHEMA_PATHS_MODULE_ID) {
        return RESOLVED_SCHEMA_PATHS_ID;
      }
    },

    // Generate content for virtual module
    async load(id, options) {
      if (id === RESOLVED_SCHEMA_PATHS_ID) {
        debugLog("Loading virtual module: schema-paths");

        // Check cache
        if (schemaPathsCache) {
          debugLog("Returning cached schema paths");
          return `export default ${JSON.stringify(schemaPathsCache, null, 2)};`;
        }

        // Generate fresh paths
        debugLog("Generating schema paths...");
        const { generateSchemaPaths } = await import("./generatePaths.ts");
        const paths = await generateSchemaPaths({
          skipAutoGenerateSchemaPaths,
          showDebugLogs,
        });

        // Cache result
        schemaPathsCache = paths;
        debugLog(`Generated ${Object.keys(paths).length} paths`);

        return `export default ${JSON.stringify(paths, null, 2)};`;
      }
    },

    // Transform +server.ts files to auto-inject validation
    async transform(code, id, options) {
      if (!skipAutoValidation && id.endsWith("+server.ts")) {
        debugLog("Transforming:", id);

        const { wrapWithValidation } = await import("./wrapValidation.ts");
        const transformed = await wrapWithValidation(
          code,
          id,
          skipValidationDefault,
          returnsDetailedErrorDefault
        );

        if (transformed) {
          debugLog("Applied validation wrapper to:", id);
          return { code: transformed };
        }
      }
    },

    // sync all types on build start
    async configureServer(server) {
      if (!skipAutoValidation) {
        debugLog("Running initial type sync...");
        server.httpServer?.on("listening", async () => {
          await _syncAllTypes();
          debugLog("Initial type sync complete");
        });
        debugLog("Type sync complete");
      }
    },

    // sync types on file change and invalidate schemaPaths cache
    async handleHotUpdate(ctx) {
      const { file, server } = ctx;

      // Invalidate schema cache if route file changed
      if (file.includes("/routes/") && file.endsWith("+server.ts")) {
        debugLog("Route file changed, invalidating cache:", file);
        schemaPathsCache = null;

        // Invalidate the virtual module to trigger reload
        const virtualModule = server.moduleGraph.getModuleById(RESOLVED_SCHEMA_PATHS_ID);
        if (virtualModule) {
          debugLog("Invalidating virtual module");
          server.moduleGraph.invalidateModule(virtualModule);
        }

        // Trigger HMR for the virtual module
        server.ws.send({
          type: 'full-reload',
          path: '*'
        });
      }

      // Sync types for changed file
      if (!skipAutoValidation && file.endsWith("+server.ts")) {
        debugLog("Syncing types for:", file);
        await _syncFileTypes(file);
      }
    },
  } as PluginOption;
}
