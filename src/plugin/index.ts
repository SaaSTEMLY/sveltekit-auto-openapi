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
   * @description If true, skips automatic validation of requests and responses based on the OpenAPI schemaPaths.
   * @default false
   */
  skipAutoValidation?: boolean;

  /**
   * @description Default value for the `$_skipValidation` flag in route configs.
   * @default undefined
   */
  skipValidationDefault?: boolean;
  /**
   * @description Default value for the `$_returnDetailedError` flag in route configs.
   * @default undefined
   */
  returnsDetailedErrorDefault?: boolean;
}

/**
 *
 * @param opts
 * @returns
 */
export default function svelteOpenApi(opts?: PluginOpts) {
  const defaultOpts = {
    showDebugLogs: false,
    skipAutoValidation: false,

    skipValidationDefault: undefined,
    returnsDetailedErrorDefault: undefined,
  };
  const {
    showDebugLogs,
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
      // TODO: modify Vite config if needed
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
        // ./generatePaths.ts
        // TODO: If cached schemaPaths exists, load from cache, if not generate new schemaPaths
        // make sure to use skipValidationDefault and returnsDetailedErrorDefault where applicable
      }
    },

    // Transform +server.ts files to auto-inject validation
    async transform(code, id, options) {
      if (!skipAutoValidation) {
        // ./wrapValidation.ts
        // TODO: implement code transformation to inject validation logic
      }
    },

    // sync all types on build start
    async configResolved(config) {
      if (!skipAutoValidation) {
        // ../sync-helper/sync.ts
        // TODO: implement type synchronization logic
      }
    },

    // sync types on file change and invalidate schemaPaths cache
    async handleHotUpdate(ctx) {
      // TODO: invalidate schemaPaths cache if applicable
      if (!skipAutoValidation) {
        // ../sync-helper/sync.ts
        // TODO: implement type synchronization logic
      }
    },
  } as PluginOption;
}
