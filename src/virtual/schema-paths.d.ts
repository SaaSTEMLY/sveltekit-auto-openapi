import type { OpenAPIV3 } from "openapi-types";

// Primary virtual module (Vite best practice)
declare module "virtual:sveltekit-auto-openapi/schema-paths" {
  const openApiSchemaPaths: OpenAPIV3.PathsObject;
  export default openApiSchemaPaths;
}

// Backwards compatibility (deprecated - will be removed in v1.0.0)
declare module "sveltekit-auto-openapi/schema-paths" {
  export * from "virtual:sveltekit-auto-openapi/schema-paths";
  export { default } from "virtual:sveltekit-auto-openapi/schema-paths";
}
