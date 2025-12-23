import type { PluginOption, ViteDevServer } from "vite";
import { generate } from "./generator.ts";
import { initBuildRuntime, closeBuildRuntime } from "./ssr-loader.ts";
import { transformServerCode } from "./transformer.ts";
import {
  injectTypesForRoute,
  injectionQueue,
  analyzeServerFile,
  typesPathToServerPath,
} from "./type-injector.ts";
import path from "path";
import fs from "fs/promises";

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

// Helper functions for type injection
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function injectTypesForAllRoutes(root: string): Promise<void> {
  const { glob } = await import("glob");

  const serverFiles = await glob("**/+server.ts", {
    cwd: path.join(root, "src"),
    absolute: true,
  });

  let successCount = 0;
  let failCount = 0;

  for (const serverPath of serverFiles) {
    const result = await injectTypesForRoute(serverPath, root);
    if (result.success && result.typesPath) {
      successCount++;
    } else {
      failCount++;
    }
  }

  console.log(
    `[sveltekit-auto-openapi] Type injection: ${successCount} routes, ${failCount} skipped`
  );
}

export default function svelteOpenApi(opts?: {
  skipSchemaGeneration?: boolean;
  enableTypeInjection?: boolean;
}) {
  const defaultOpts = {
    skipSchemaGeneration: false,
    enableTypeInjection: true,
  };
  const mergedOpts = { ...defaultOpts, ...opts };

  let server: ViteDevServer | null = null;
  let root = process.cwd();
  let cachedSchema: any = null;
  let isGenerating = false;
  let isProcessingTypeChange = false;

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

      // Only set up watchers if type injection is enabled
      if (!mergedOpts.enableTypeInjection) return;

      // Inject types for all routes on server start
      // This ensures types are injected even if user ran `svelte-kit sync` manually
      console.log("[sveltekit-auto-openapi] Injecting types on dev server startup...");
      (async () => {
        try {
          await injectTypesForAllRoutes(root);
        } catch (err) {
          console.error("[sveltekit-auto-openapi] Failed to inject types on startup:", err);
        }
      })();

      // Watch .svelte-kit/types directory for SvelteKit regenerations
      const typesDir = path.join(root, ".svelte-kit/types");
      server.watcher.add(`${typesDir}/**/$types.d.ts`);

      // Re-patch when SvelteKit overwrites our changes
      server.watcher.on("change", async (file) => {
        if (isProcessingTypeChange) return; // Prevent re-entry

        if (file.includes(".svelte-kit/types") && file.endsWith("$types.d.ts")) {
          isProcessingTypeChange = true;

          try {
            const serverPath = typesPathToServerPath(file, root);
            const exists = await fileExists(serverPath);

            if (exists) {
              debug(`Re-injecting types after SvelteKit regeneration: ${file}`);
              await injectTypesForRoute(serverPath, root);
            }
          } finally {
            // Debounce to prevent rapid re-triggering
            setTimeout(() => {
              isProcessingTypeChange = false;
            }, 100);
          }
        }
      });

      // Process pending injections when types directory appears or expands
      server.watcher.on("add", async (file) => {
        if (file.includes(".svelte-kit/types")) {
          await injectionQueue.processPending(root);
        }
      });
    },

    // Transform +server.ts files to auto-inject validation
    transform(code: string, id: string) {
      // Only process +server.ts files
      if (!id.endsWith("+server.ts")) return null;

      // Quick regex check before expensive AST parsing
      if (!code.includes("_config")) return null;

      const transformed = transformServerCode(code, id);
      if (!transformed) return null;

      debug(`✓ Transformed ${id}`);

      return {
        code: transformed,
        map: null,
      };
    },

    async buildStart() {
      // Initialize module runtime for production builds
      if (!server) {
        console.log(
          "[sveltekit-auto-openapi] Initializing build-mode module runtime..."
        );
        await initBuildRuntime(root);

        // Inject types for all routes before compilation
        if (mergedOpts.enableTypeInjection) {
          console.log("[sveltekit-auto-openapi] Injecting types for build...");
          await injectTypesForAllRoutes(root);
        }
      }
    },

    // Resolve virtual module
    resolveId(id) {
      if (id === SCHEMA_PATHS_MODULE_ID) {
        return RESOLVED_SCHEMA_PATHS_ID;
      }
    },

    // Load virtual module
    async load(id) {
      if (id === RESOLVED_SCHEMA_PATHS_ID) {
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
        if (!cachedSchema) {
          isGenerating = true;
          console.log("Generating OpenAPI schema and Validation map...");

          try {
            // Pass server to enable runtime Zod schema loading
            // If route files import virtual modules, they'll get stubs (see above)
            const { openApiPaths } = await generate(server, root, mergedOpts);

            // Only cache if we got valid data (not empty from re-entry guard)
            if (Object.keys(openApiPaths).length > 0) {
              console.log("✓ Generation complete.");
              cachedSchema = openApiPaths;

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
              }
            } else {
              debug(
                "⚠️ Generation returned empty data, keeping existing cache"
              );
              // Initialize cache with empty objects if still null
              if (!cachedSchema) cachedSchema = {};
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
      }
    },

    async buildEnd() {
      // Cleanup module runtime after build
      await closeBuildRuntime();
      if (mergedOpts.enableTypeInjection) {
        injectionQueue.clear();
      }
    },

    // Production build hook - for logging/cleanup only
    // Virtual modules are automatically bundled by Vite/Rollup via resolveId + load hooks
    async closeBundle() {
      if (!cachedSchema) {
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
    },

    // Trigger HMR on file change
    async handleHotUpdate({ file, server, read }) {
      if (file.endsWith("+server.ts")) {
        // Handle type injection if enabled
        if (mergedOpts.enableTypeInjection) {
          const content = await read();
          const result = await injectTypesForRoute(file, root, content);

          if (!result.success && result.error?.includes("not generated yet")) {
            // Types don't exist yet, queue for later
            const { hasConfig, methods } = await analyzeServerFile(file, content);
            if (hasConfig && methods.length > 0) {
              injectionQueue.add(file, methods);
            }
          }
        }

        // Clear cache to force regeneration on next load
        cachedSchema = null;

        // Invalidate the virtual module to trigger regeneration
        const schemaModule = server.moduleGraph.getModuleById(
          RESOLVED_SCHEMA_PATHS_ID
        );
        if (schemaModule) {
          server.moduleGraph.invalidateModule(schemaModule);
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
