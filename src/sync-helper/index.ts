import { _syncAllTypes } from "./sync.ts";

export const generateAutoOpenApiTypes = () => {
  if (
    process.argv[1]?.endsWith(".bin/svelte-kit") &&
    process.argv[2] === "sync"
  ) {
    _syncAllTypes();
  }
};
