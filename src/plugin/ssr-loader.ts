import type { ViteDevServer } from "vite";
import * as path from "path";

// Debug mode controlled by environment variable
const DEBUG = process.env.DEBUG_OPENAPI === "true";

function debug(...args: any[]) {
  if (DEBUG) {
    console.log("[ssr-loader]", ...args);
  }
}

export interface RouteConfig {
  standardSchema?: Record<string, any>;
  openapiOverride?: Record<string, any>;
}

/**
 * Initialize build runtime - no-op for now since we use direct imports
 */
export async function initBuildRuntime(root: string) {
  debug("Build runtime initialization (using native imports)");
}

/**
 * Load _config export from a route module
 * Works in both dev and production builds
 */
export async function loadModuleConfig(
  filePath: string,
  server: ViteDevServer | null,
  root: string
): Promise<RouteConfig | null> {
  try {
    // Dev mode: use server's SSR loader
    if (server) {
      debug(`Loading config from ${filePath} (dev mode)`);
      const module = await server.ssrLoadModule(filePath);

      if (module._config) {
        debug(`  ✓ Found _config in ${filePath}`);
        return module._config;
      }

      debug(`  ℹ No _config in ${filePath}`);
      return null;
    }

    // Build mode: use native dynamic import
    // This works because Bun/Node can handle TypeScript directly
    debug(`Loading config from ${filePath} (build mode)`);

    // Convert to absolute path and file:// URL for import
    const absolutePath = path.isAbsolute(filePath)
      ? filePath
      : path.resolve(root, filePath);

    // Use dynamic import with cache busting
    const fileUrl = `${absolutePath}?t=${Date.now()}`;

    const module = await import(fileUrl);

    if (module._config) {
      debug(`  ✓ Found _config in ${filePath}`);
      return module._config;
    }

    debug(`  ℹ No _config in ${filePath}`);
    return null;
  } catch (error: unknown) {
    const err = error as Error;
    console.warn(
      `[sveltekit-auto-openapi] Failed to load config from ${filePath}:`,
      err.message
    );
    debug("  Stack trace:", err.stack);
    return null; // Graceful fallback to AST-only
  }
}

/**
 * Cleanup build runtime - no-op since we use native imports
 */
export async function closeBuildRuntime() {
  debug("Build runtime cleanup (no-op for native imports)");
}
