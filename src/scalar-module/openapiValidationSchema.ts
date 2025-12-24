import { z, ZodType } from "zod";

// --- 0. Helpers ---

/**
 * Helper to mimic "z.looseObject" behavior.
 * OpenAPI objects often allow "Vendor Extensions" (x-something),
 * so we use .passthrough() to allow unknown keys.
 */
const looseObject = <T extends z.ZodRawShape>(shape: T) =>
  z.object(shape).passthrough();

// --- 1. Type Definitions ---
// Defining these interfaces strictly allows us to handle the recursion
// without TypeScript getting confused by Zod's inferred types.

export interface OpenAPIReference {
  $ref: string;
  summary?: string;
  description?: string;
}

// We use an interface for better recursive type handling in TS
export interface OpenAPISchemaType {
  type?:
    | "string"
    | "number"
    | "integer"
    | "boolean"
    | "array"
    | "object"
    | "null";
  format?: string;
  pattern?: string;
  // Recursion: properties refer back to the Interface, not the Zod Schema directly
  properties?: Record<string, OpenAPISchemaType | OpenAPIReference>;
  additionalProperties?: boolean | OpenAPISchemaType | OpenAPIReference;
  items?: OpenAPISchemaType | OpenAPIReference;
  required?: string[];
  enum?: any[];
  const?: any;
  allOf?: (OpenAPISchemaType | OpenAPIReference)[];
  oneOf?: (OpenAPISchemaType | OpenAPIReference)[];
  anyOf?: (OpenAPISchemaType | OpenAPIReference)[];
  not?: OpenAPISchemaType | OpenAPIReference;
  title?: string;
  description?: string;
  default?: any;
  example?: any;
  nullable?: boolean;
  readOnly?: boolean;
  writeOnly?: boolean;
  deprecated?: boolean;
  $schema?: string;
  [key: string]: any; // Allow vendor extensions in the type definition
}

// --- 2. Base Components ---

const ReferenceObject: ZodType<OpenAPIReference> = looseObject({
  $ref: z.string(),
  summary: z.string().optional(),
  description: z.string().optional(),
});

const ExternalDocumentation = looseObject({
  description: z.string().optional(),
  url: z.string().url(),
});

const Contact = looseObject({
  name: z.string().optional(),
  url: z.string().url().optional(),
  email: z.string().email().optional(),
});

const License = looseObject({
  name: z.string(),
  url: z.string().url().optional(),
});

const Info = looseObject({
  title: z.string(),
  description: z.string().optional(),
  termsOfService: z.string().url().optional(),
  contact: Contact.optional(),
  license: License.optional(),
  version: z.string(),
});

const ServerVariable = looseObject({
  enum: z.array(z.string()).optional(),
  default: z.string(),
  description: z.string().optional(),
});

const Server = looseObject({
  url: z.string(),
  description: z.string().optional(),
  variables: z.record(z.string(), ServerVariable).optional(),
});

// --- 3. The Recursive Schema Object ---

/**
 * We explicitly type this as ZodType<OpenAPISchemaType>.
 * Inside z.lazy, we use a "Base" schema definition to avoid
 * circular inference issues.
 */
const SchemaObject: ZodType<OpenAPISchemaType> = z.lazy(() => {
  return looseObject({
    type: z
      .enum([
        "string",
        "number",
        "integer",
        "boolean",
        "array",
        "object",
        "null",
      ])
      .optional(),
    format: z.string().optional(),
    pattern: z.string().optional(),

    // Recursion: We use SchemaObject here.
    // TS knows SchemaObject is ZodType<OpenAPISchemaType>, so it matches.
    properties: z
      .record(z.string(), z.union([SchemaObject, ReferenceObject]))
      .optional(),
    additionalProperties: z
      .union([z.boolean(), SchemaObject, ReferenceObject])
      .optional(),
    items: z.union([SchemaObject, ReferenceObject]).optional(),
    required: z.array(z.string()).optional(),

    allOf: z.array(z.union([SchemaObject, ReferenceObject])).optional(),
    oneOf: z.array(z.union([SchemaObject, ReferenceObject])).optional(),
    anyOf: z.array(z.union([SchemaObject, ReferenceObject])).optional(),
    not: z.union([SchemaObject, ReferenceObject]).optional(),

    title: z.string().optional(),
    description: z.string().optional(),
    default: z.any().optional(),
    example: z.any().optional(),
    enum: z.array(z.any()).optional(),
    const: z.any().optional(),
    nullable: z.boolean().optional(),
    readOnly: z.boolean().optional(),
    writeOnly: z.boolean().optional(),
    deprecated: z.boolean().optional(),
    $schema: z.string().optional(),
  });
});

// --- 4. Request & Response Components ---

const MediaType = looseObject({
  schema: z.union([SchemaObject, ReferenceObject]).optional(),
  example: z.any().optional(),
  examples: z.record(z.string(), z.any()).optional(),
  encoding: z.record(z.string(), z.any()).optional(),
});

const Parameter = looseObject({
  name: z.string(),
  in: z.enum(["query", "header", "path", "cookie"]),
  description: z.string().optional(),
  required: z.boolean().optional(),
  deprecated: z.boolean().optional(),
  allowEmptyValue: z.boolean().optional(),
  schema: z.union([SchemaObject, ReferenceObject]).optional(),
  style: z.string().optional(),
  explode: z.boolean().optional(),
  example: z.any().optional(),
});

const RequestBody = looseObject({
  description: z.string().optional(),
  content: z.record(z.string(), MediaType),
  required: z.boolean().optional(),
});

const Response = looseObject({
  description: z.string(),
  headers: z.record(z.string(), z.union([ReferenceObject, z.any()])).optional(),
  content: z.record(z.string(), MediaType).optional(),
  links: z.record(z.string(), z.any()).optional(),
});

// --- 5. Operations & Paths ---

const Operation = looseObject({
  tags: z.array(z.string()).optional(),
  summary: z.string().optional(),
  description: z.string().optional(),
  externalDocs: ExternalDocumentation.optional(),
  operationId: z.string().optional(),
  parameters: z.array(z.union([Parameter, ReferenceObject])).optional(),
  requestBody: z.union([RequestBody, ReferenceObject]).optional(),
  responses: z.record(z.string(), z.union([Response, ReferenceObject])),
  deprecated: z.boolean().optional(),
  security: z.array(z.record(z.string(), z.array(z.string()))).optional(),
  servers: z.array(Server).optional(),
});

const PathItem = looseObject({
  $ref: z.string().optional(),
  summary: z.string().optional(),
  description: z.string().optional(),
  get: Operation.optional(),
  put: Operation.optional(),
  post: Operation.optional(),
  delete: Operation.optional(),
  options: Operation.optional(),
  head: Operation.optional(),
  patch: Operation.optional(),
  trace: Operation.optional(),
  servers: z.array(Server).optional(),
  parameters: z.array(z.union([Parameter, ReferenceObject])).optional(),
});

// --- 6. Components & Root ---

const Components = looseObject({
  schemas: z
    .record(z.string(), z.union([SchemaObject, ReferenceObject]))
    .optional(),
  responses: z
    .record(z.string(), z.union([Response, ReferenceObject]))
    .optional(),
  parameters: z
    .record(z.string(), z.union([Parameter, ReferenceObject]))
    .optional(),
  examples: z
    .record(z.string(), z.union([z.any(), ReferenceObject]))
    .optional(),
  requestBodies: z
    .record(z.string(), z.union([RequestBody, ReferenceObject]))
    .optional(),
  headers: z.record(z.string(), z.union([z.any(), ReferenceObject])).optional(),
  securitySchemes: z
    .record(z.string(), z.union([z.any(), ReferenceObject]))
    .optional(),
  links: z.record(z.string(), z.union([z.any(), ReferenceObject])).optional(),
  callbacks: z
    .record(z.string(), z.union([z.any(), ReferenceObject]))
    .optional(),
});

const Tag = looseObject({
  name: z.string(),
  description: z.string().optional(),
  externalDocs: ExternalDocumentation.optional(),
});

// *** The Final Schema ***
export const OpenAPISchema = looseObject({
  openapi: z.string().regex(/^3\.\d+\.\d+$/, "Must be an OpenAPI 3.x version"),
  info: Info,
  servers: z.array(Server).optional(),
  paths: z.record(z.string().startsWith("/"), PathItem),
  components: Components.optional(),
  security: z.array(z.record(z.string(), z.array(z.string()))).optional(),
  tags: z.array(Tag).optional(),
  externalDocs: ExternalDocumentation.optional(),
});

// Type inference helper
export type OpenAPIObject = z.infer<typeof OpenAPISchema>;
