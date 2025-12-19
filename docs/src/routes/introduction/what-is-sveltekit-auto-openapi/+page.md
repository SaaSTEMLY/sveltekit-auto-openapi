---
title: What is sveltekit-auto-openapi?
description: Learn about the architecture and core concepts of SvelteKit Auto OpenAPI
---

# What is sveltekit-auto-openapi?

SvelteKit Auto OpenAPI is a library that automatically generates OpenAPI schemas from your SvelteKit routes and provides runtime validation - all while maintaining full type safety.

## Core Concept

Instead of manually writing OpenAPI specifications, you write standard SvelteKit code with TypeScript types. The library analyzes your code and generates OpenAPI schemas automatically.

## Architecture

The library consists of three main modules that work together:

```
┌─────────────────────┐
│ +server.ts Routes   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   Vite Plugin       │  Analyzes code & generates schemas
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Virtual Modules    │  Generated at build time
└─────┬───────────┬───┘
      │           │
      ▼           ▼
┌───────────┐  ┌──────────────┐
│ Validation│  │ Scalar Module│
│   Hook    │  │              │
└─────┬─────┘  └──────┬───────┘
      │               │
      ▼               ▼
  Runtime       OpenAPI JSON +
  Validation    Documentation UI
```

### 1. Vite Plugin (`sveltekit-auto-openapi/plugin`)

The Vite plugin analyzes your `+server.ts` files at build time:

- Parses TypeScript AST to infer schemas from types
- Extracts `_config` exports for validation rules
- Generates virtual modules containing schemas and validation maps
- Supports hot reload for instant updates during development

### 2. Schema Validation Hook (`sveltekit-auto-openapi/schema-validation-hook`)

A SvelteKit handle hook that validates requests and responses:

- Validates request headers, cookies, query parameters, and body
- Validates response headers, cookies, and body (optional)
- Uses JSON Schema for validation via `@cfworker/json-schema`
- Supports StandardSchema (Zod, Valibot, TypeBox, ArkType)

### 3. Scalar Module (`sveltekit-auto-openapi/scalar-module`)

Serves OpenAPI documentation:

- Exposes OpenAPI JSON schema at `/api-docs/openapi.json`
- Provides interactive API documentation UI at `/api-docs/scalar`
- Powered by [Scalar](https://scalar.com)

## Request/Response Flow

Here's what happens when a request comes in:

1. **Client** sends HTTP Request
2. **Schema Validation Hook** receives the request
   - Loads validation config from virtual module
   - Validates headers, cookies, query parameters, body
3. **If validation fails**: Return 400 Bad Request with error details
4. **If validation passes**: Forward to route handler
5. **Route Handler** processes business logic and returns response
6. **Schema Validation Hook** validates response (if enabled)
   - If response validation fails: Return 500 Internal Server Error
   - If response validation passes: Return validated response to client

## Three Levels of Usage

SvelteKit Auto OpenAPI supports three progressive levels:

### Level 1: Automatic (AST Inference)

Just write standard SvelteKit code with types - schemas are inferred automatically.

```ts
export async function POST({ request }) {
  const { email }: { email: string } = await request.json();
  return json({ success: true });
}
```

### Level 2: Strict (Runtime Validation)

Export a `_config` object with validation schemas using StandardSchema (Zod, Valibot, etc.).

```ts
export const _config = {
  openapiOverride: {
    POST: {
      requestBody: {
        /* validation schema */
      },
      responses: {
        /* validation schema */
      },
    },
  },
} satisfies RouteConfig;
```

### Level 3: Raw JSON Schema

Use raw JSON Schema objects directly without StandardSchema.

```ts
export const _config = {
  openapiOverride: {
    POST: {
      requestBody: {
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                /* ... */
              },
            },
          },
        },
      },
    },
  },
} satisfies RouteConfig;
```

## When to Use This Library

SvelteKit Auto OpenAPI is ideal when you:

- Want API documentation without manual maintenance
- Need runtime validation with type safety
- Prefer TypeScript types over decorators or custom syntax
- Want to maintain standard SvelteKit patterns

## When NOT to Use This Library

Consider alternatives if you:

- Already have manually written OpenAPI specs
- Don't need runtime validation
- Are building non-API routes (SSR pages, forms)

## Key Concepts

### Virtual Modules

The Vite plugin generates two virtual modules:

- `virtual:sveltekit-auto-openapi/schema-paths` - Complete OpenAPI paths object
- `virtual:sveltekit-auto-openapi/schema-validation-map` - Validation configuration registry

These are used internally by the validation hook and Scalar module.

### StandardSchema Support

StandardSchema is a universal schema standard supported by multiple validation libraries. You can use:

- **Zod** - `z.object({...}).toJSONSchema()`
- **Valibot** - Schema objects with `.toJSONSchema()`
- **TypeBox** - Type builder patterns
- **ArkType** - Type definitions

All convert to JSON Schema for validation.

### AST Inference

The plugin uses `ts-morph` to analyze your TypeScript code and extract type information from patterns like:

- `request.json<Type>()`
- `const body: Type = await request.json()`
- `await request.json() as Type`

## Next Steps

Ready to get started? Check out the [Quick Start](/introduction/quick-start/) guide.

Want to dive deeper? Explore the [Essentials](/essentials/plugin-configuration/) section.
