#!/usr/bin/env node
import { injectTypesForRoute } from "../plugin/type-injector.ts";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const DEBUG = process.env.DEBUG_OPENAPI === "true";

function debug(...args: any[]) {
  if (DEBUG) console.log("[sync]", ...args);
}

export async function sync(cwd: string = process.cwd()) {
  // Step 1: Inject types for all routes
  debug("[sveltekit-auto-openapi] Injecting types...");
  try {
    const { glob } = await import("glob");

    const serverFiles = await glob("**/+server.ts", {
      cwd: path.join(cwd, "src"),
      absolute: true,
    });

    let successCount = 0;
    let failCount = 0;

    for (const serverPath of serverFiles) {
      const result = await injectTypesForRoute(serverPath, cwd);
      if (result.success && result.typesPath) {
        successCount++;
        debug(`Injected types for ${path.basename(path.dirname(serverPath))}`);
      } else {
        failCount++;
      }
    }

    debug(
      `[sveltekit-auto-openapi] ✓ Type injection: ${successCount} routes, ${failCount} skipped`
    );
  } catch (err) {
    console.error("[sveltekit-auto-openapi] Failed to inject types:", err);
    process.exit(1);
  }
}
