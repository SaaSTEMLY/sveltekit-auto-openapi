import type { OpenAPIV3 } from "openapi-types";

declare module "virtual:sveltekit-auto-openapi/schema-paths" {
  const openApiSchemaPaths: OpenAPIV3.PathsObject;
  export default openApiSchemaPaths;
}
