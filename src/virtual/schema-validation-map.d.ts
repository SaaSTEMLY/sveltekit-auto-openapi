// Validation config with flags - stores JSON Schema (converted from Zod at build time)
export interface ValidationSchemaConfig {
  schema: any; // JSON Schema object
  showErrorMessage?: boolean;
  skipValidation?: boolean;
}

// Input validation config structure
export interface InputValidationConfig {
  body?: ValidationSchemaConfig;
  query?: ValidationSchemaConfig;
  parameters?: ValidationSchemaConfig; // Path parameters
  headers?: ValidationSchemaConfig;
  cookies?: ValidationSchemaConfig;
}

// Output validation config structure (keyed by status code)
export interface OutputValidationConfig {
  body?: ValidationSchemaConfig;
  headers?: Record<string, ValidationSchemaConfig>; // Header-specific validation
  cookies?: ValidationSchemaConfig;
}

// Method-level validation config
export interface MethodValidationConfig {
  input?: InputValidationConfig;
  output?: Record<string, OutputValidationConfig>; // Keyed by status code
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
    ValidationSchemaConfig,
    InputValidationConfig,
    OutputValidationConfig,
    MethodValidationConfig,
  } from "./schema-validation-map.d.ts";

  const validationRegistry: ValidationRegistry;
  export const initPromise: Promise<void> | undefined;
  export default validationRegistry;
  export type {
    ValidationRegistry,
    ValidationSchemaConfig,
    InputValidationConfig,
    OutputValidationConfig,
    MethodValidationConfig,
  };
}
