import type { z } from "zod";

// Input validation config structure
export interface InputValidationConfig {
  body?: z.ZodType<any>;
  query?: z.ZodType<any>;
  parameters?: z.ZodType<any>;
  headers?: z.ZodType<any>;
  cookies?: z.ZodType<any>;
}

// Output validation config structure (keyed by status code)
export interface OutputValidationConfig {
  body?: z.ZodType<any>;
  headers?: z.ZodType<any>;
  cookies?: z.ZodType<any>;
}

// Method-level validation config
export interface MethodValidationConfig {
  input?: InputValidationConfig;
  output?: Record<string, OutputValidationConfig>;
  isImplemented?: boolean; // Track if method is actually exported in +server.ts
}

// Registry maps route paths to methods to validation configs
export type ValidationRegistry = Record<
  string,
  Record<string, MethodValidationConfig | undefined>
>;

// Primary virtual module (Vite best practice)
declare module "virtual:sveltekit-auto-openapi/schema-validation-map" {
  import type {
    ValidationRegistry,
    InputValidationConfig,
    OutputValidationConfig,
    MethodValidationConfig,
  } from "./schema-validation-map.d.ts";

  const validationRegistry: ValidationRegistry;
  export const initPromise: Promise<void> | undefined;
  export default validationRegistry;
  export type {
    ValidationRegistry,
    InputValidationConfig,
    OutputValidationConfig,
    MethodValidationConfig,
  };
}

// Backwards compatibility (deprecated - will be removed in v1.0.0)
declare module "sveltekit-auto-openapi/schema-validation-map" {
  export * from "virtual:sveltekit-auto-openapi/schema-validation-map";
  export { default } from "virtual:sveltekit-auto-openapi/schema-validation-map";
}
