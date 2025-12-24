import { sync } from "./sync.ts";

export const generateAutoOpenApiTypes = () => {
  if (
    process.argv[1]?.endsWith(".bin/svelte-kit") &&
    process.argv[2] === "sync"
  ) {
    const cwd = process.cwd();
    sync(cwd).catch((err) => {
      console.error("[sveltekit-auto-openapi] Error during sync:", err);
      process.exit(1);
    });
  }
};
