import type { Plugin, PluginOption, ViteDevServer } from "vite";
import { generate } from "./generator.ts";
import { initBuildRuntime, closeBuildRuntime } from "./ssr-loader.ts";
import { transformServerCode } from "./transformer.ts";

// Debug mode controlled by environment variable
const DEBUG = process.env.DEBUG_OPENAPI === "true";

function debug(...args: any[]) {
  if (DEBUG) {
    console.log(...args);
  }
}

// Virtual module IDs following Vite best practices
const SCHEMA_PATHS_MODULE_ID = "virtual:sveltekit-auto-openapi/schema-paths";
const RESOLVED_SCHEMA_PATHS_ID = "\0" + SCHEMA_PATHS_MODULE_ID;

const VALIDATION_MAP_MODULE_ID =
  "virtual:sveltekit-auto-openapi/schema-validation-map";
const RESOLVED_VALIDATION_MAP_ID = "\0" + VALIDATION_MAP_MODULE_ID;

export default function svelteOpenApi(opts?: {
  skipSchemaGeneration?: boolean;
  skipValidationMapGeneration?: boolean;
}) {
  const defaultOpts = {
    skipSchemaGeneration: false,
    skipValidationMapGeneration: false,
  };
  const mergedOpts = { ...defaultOpts, ...opts };

  let server: ViteDevServer | null = null;
  let root = process.cwd();
  let cachedSchema: any = null;
  let cachedValidationMap: any = null;
  let isGenerating = false;

  return {
    name: "sveltekit-auto-openapi",
    enforce: "pre",

    config() {
      return {
        optimizeDeps: {
          // Prevent Vite from pre-bundling this package so the plugin hooks can run
          exclude: ["sveltekit-auto-openapi"],
        },
        ssr: {
          // Prevent Vite from externalizing this package in SSR so the plugin hooks can run
          noExternal: ["sveltekit-auto-openapi"],
        },
      };
    },

    configResolved(config) {
      root = config.root;
    },

    configureServer(_server) {
      server = _server;
    },

    // Transform +server.ts files to auto-inject validation
    transform(code: string, id: string) {
      // Only process +server.ts files
      if (!id.endsWith('+server.ts')) return null;

      // Quick regex check before expensive AST parsing
      if (!code.includes('_config')) return null;

      const transformed = transformServerCode(code, id);
      if (!transformed) return null;

      debug(`✓ Transformed ${id}`);

      return {
        code: transformed,
        map: null
      };
    },

    async buildStart() {
      // Initialize module runtime for production builds
      if (!server) {
        console.log(
          "[sveltekit-auto-openapi] Initializing build-mode module runtime..."
        );
        await initBuildRuntime(root);
      }
    },

    // Resolve virtual module
    resolveId(id) {
      if (id === SCHEMA_PATHS_MODULE_ID) {
        return RESOLVED_SCHEMA_PATHS_ID;
      }
      if (id === VALIDATION_MAP_MODULE_ID) {
        return RESOLVED_VALIDATION_MAP_ID;
      }
    },

    // Load virtual module
    async load(id) {
      if (
        id === RESOLVED_SCHEMA_PATHS_ID ||
        id === RESOLVED_VALIDATION_MAP_ID
      ) {
        // CRITICAL: If we're currently generating and a route file imports this virtual module
        // during SSR loading, we must return cached data or empty stub immediately to avoid deadlock
        if (isGenerating) {
          debug(
            "⚠️ Virtual module requested during generation - returning stub to prevent deadlock"
          );

          if (id === RESOLVED_SCHEMA_PATHS_ID) {
            return `export default ${JSON.stringify(
              cachedSchema || {},
              null,
              2
            )};`;
          } else {
            return `export default {}; export const initPromise = Promise.resolve();`;
          }
        }

        // Generate if we don't have cached data
        if (!cachedSchema || !cachedValidationMap) {
          isGenerating = true;
          console.log("Generating OpenAPI schema and Validation map...");

          try {
            // Pass server to enable runtime Zod schema loading
            // If route files import virtual modules, they'll get stubs (see above)
            const { openApiPaths, validationMap } = await generate(
              server,
              root,
              mergedOpts
            );

            // Only cache if we got valid data (not empty from re-entry guard)
            if (
              Object.keys(openApiPaths).length > 0 ||
              Object.keys(validationMap).length > 0
            ) {
              console.log("✓ Generation complete.");
              cachedSchema = openApiPaths;
              cachedValidationMap = validationMap;

              // CRITICAL: Invalidate the virtual modules in Vite's module graph
              // This forces any route files that imported the stub during SSR loading
              // to reload and get the real data
              if (server) {
                const schemaModule = server.moduleGraph.getModuleById(
                  RESOLVED_SCHEMA_PATHS_ID
                );
                if (schemaModule) {
                  server.moduleGraph.invalidateModule(schemaModule);
                  debug("✓ Invalidated schema module to reload with real data");
                }

                const validationMapModule = server.moduleGraph.getModuleById(
                  RESOLVED_VALIDATION_MAP_ID
                );
                if (validationMapModule) {
                  server.moduleGraph.invalidateModule(validationMapModule);
                  debug(
                    "✓ Invalidated validation map module to reload with real data"
                  );
                }
              }
            } else {
              debug(
                "⚠️ Generation returned empty data, keeping existing cache"
              );
              // Initialize cache with empty objects if still null
              if (!cachedSchema) cachedSchema = {};
              if (!cachedValidationMap) cachedValidationMap = {};
            }
          } finally {
            isGenerating = false;
          }
        }

        if (id === RESOLVED_SCHEMA_PATHS_ID) {
          try {
            // Use null instead of server to avoid circular dependencies during SSR
            return `export default ${JSON.stringify(
              cachedSchema || {},
              null,
              2
            )};`;
          } catch (err) {
            console.error("Failed to generate OpenAPI schema:", err);
            return `export default {};`;
          }
        }

        if (id === RESOLVED_VALIDATION_MAP_ID) {
          try {
            // New approach: Directly embed validation configs (no lazy-loading needed)
            // Validation configs now contain JSON Schemas (converted from Zod at build time)

            // Generate the complete module code with embedded validation registry
            return `
// Auto-generated validation registry with embedded JSON Schemas
const validationRegistry = ${JSON.stringify(
              cachedValidationMap || {},
              null,
              2
            )};

export default validationRegistry;
export const initPromise = Promise.resolve();
`;
          } catch (err) {
            console.error("Failed to generate validation map:", err);
            return `export default {}; export const initPromise = Promise.resolve();`;
          }
        }
      }
    },

    async buildEnd() {
      // Cleanup module runtime after build
      await closeBuildRuntime();
    },

    // Production build hook - for logging/cleanup only
    // Virtual modules are automatically bundled by Vite/Rollup via resolveId + load hooks
    async closeBundle() {
      if (!cachedSchema || !cachedValidationMap) {
        debug(
          "⚠️ closeBundle: No cached schema/validation map - generation may not have run"
        );
        return;
      }

      console.log(
        `✓ OpenAPI schema bundled with ${
          Object.keys(cachedSchema).length
        } route(s)`
      );
      debug(
        `✓ Validation map bundled with ${
          Object.keys(cachedValidationMap).length
        } route(s)`
      );
    },

    // Trigger HMR on file change
    handleHotUpdate({ file, server }) {
      if (file.endsWith("+server.ts")) {
        // Clear cache to force regeneration on next load
        cachedSchema = null;
        cachedValidationMap = null;

        // Invalidate the virtual module to trigger regeneration
        const schemaModule = server.moduleGraph.getModuleById(
          RESOLVED_SCHEMA_PATHS_ID
        );
        if (schemaModule) {
          server.moduleGraph.invalidateModule(schemaModule);
        }

        const validationMapModule = server.moduleGraph.getModuleById(
          RESOLVED_VALIDATION_MAP_ID
        );
        if (validationMapModule) {
          server.moduleGraph.invalidateModule(validationMapModule);
        }

        debug(
          "API Route changed, OpenAPI schema will regenerate on next import."
        );

        // Return empty array to trigger full reload for the virtual module
        return [];
      }
    },
  } as PluginOption;
}
