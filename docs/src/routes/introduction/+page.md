---
title: What is SvelteKit Auto OpenAPI?
description: Learn about automatic OpenAPI generation and runtime validation for SvelteKit
---

# What is SvelteKit Auto OpenAPI?

SvelteKit Auto OpenAPI is a Vite plugin that automatically generates OpenAPI documentation and enforces runtime validation for your SvelteKit API routes. Write standard SvelteKit code and get documented, validated APIs for free.

## What Problem Does It Solve?

Building APIs typically requires maintaining three separate systems:

1. **Your API implementation** - The actual route handlers
2. **API documentation** - OpenAPI/Swagger specs describing your endpoints
3. **Validation logic** - Runtime checks for request/response data

This leads to common problems:

- **Documentation drift** - Docs become outdated as code changes
- **Manual boilerplate** - Writing validation for every endpoint is tedious
- **Type safety gaps** - Runtime validation doesn't match TypeScript types
- **Maintenance burden** - Updating specs, types, and validation separately

SvelteKit Auto OpenAPI solves this by making your code the single source of truth. The plugin analyzes your routes, generates OpenAPI specs automatically, and adds runtime validation that stays in sync with your types.

## Core Concepts

### Automatic Schema Inference

The plugin uses AST (Abstract Syntax Tree) analysis to understand your code without execution:

```typescript
// src/routes/api/users/+server.ts
export async function POST({ request }) {
  const { email }: { email: string } = await request.json();
  // Plugin reads this type annotation ↑
  return json({ success: true });
  // And this return type ↑
}
```

From this simple code, the plugin generates a complete OpenAPI schema describing the endpoint's inputs and outputs.

### Type-Safe Validation

When you add explicit configuration, the plugin validates incoming requests and outgoing responses at runtime:

```typescript
export const _config = {
  openapiOverride: {
    POST: {
      requestBody: {
        content: {
          "application/json": {
            schema: { /* JSON Schema */ }
          }
        }
      }
    }
  }
} satisfies RouteConfig;

export async function POST({ validated, json, error }) {
  const { email } = validated.body;  // ← Fully typed & validated
  // ...
}
```

The `validated` object is injected by the plugin and contains your parsed, validated request data.

### Zero-Boilerplate Approach

Unlike other solutions that require decorators, special classes, or framework-specific syntax, SvelteKit Auto OpenAPI works directly with standard SvelteKit `+server.ts` files. No learning curve, no migration needed.

## Three Levels of Usage

The plugin supports three approaches based on your needs:

### Level 1: Automatic (AST Inference Only)

Just write normal SvelteKit code with type hints. The plugin infers the schema:

- **Pros**: Zero configuration, works with existing code
- **Cons**: No runtime validation, basic type inference only
- **Use case**: Quick prototypes, internal APIs, documentation-only needs

### Level 2: Strict (With Validation)

Export a `_config` object with validation schemas using Zod, TypeBox, or JSON Schema:

- **Pros**: Runtime validation, detailed docs, full type safety
- **Cons**: More verbose, requires schema definitions
- **Use case**: Production APIs, public endpoints, strict contracts

### Level 3: Raw JSON Schema

Use pure JSON Schema without StandardSchema libraries:

- **Pros**: No dependencies, precise control, portable
- **Cons**: More verbose than Zod/TypeBox, less type inference
- **Use case**: Legacy systems, schema reuse, framework independence

## Key Features

### 🔎 Automatic Inference
Analyzes `request.json<Type>()` calls and return statements to generate schemas without manual configuration.

### 🛡️ Runtime Validation
Validates headers, cookies, query parameters, path parameters, request bodies, and responses using JSON Schema.

### 🌐 StandardSchema Support
Works seamlessly with [Zod](https://zod.dev), [TypeBox](https://github.com/sinclairzx81/typebox), [Valibot](https://valibot.dev), and [ArkType](https://arktype.io).

### 📘 Interactive Documentation
Built-in [Scalar](https://scalar.com) integration provides beautiful, interactive API documentation out of the box.

### ⚡ Zero Boilerplate
Works directly with standard SvelteKit `+server.ts` files - no decorators, no special syntax, no framework lock-in.

### 🔄 Hot Reload
OpenAPI schemas update instantly as you modify routes during development with full HMR support.

### 🚀 Production Optimized
Each route only loads its own validation code - no monolithic bundle, no unnecessary overhead.

### 🎯 Full TypeScript Integration
Automatic type inference from schemas with IDE autocomplete for `validated`, `json()`, and `error()` helpers.

## When to Use

SvelteKit Auto OpenAPI is ideal when you need:

- **API documentation** that never goes out of sync
- **Type safety** from request to response
- **Runtime validation** without manual boilerplate
- **Team collaboration** with clear API contracts
- **Public APIs** that need professional documentation
- **Microservices** with standardized OpenAPI specs

## When NOT to Use

Skip this plugin if:

- **No APIs** - Your SvelteKit app only serves pages, no API routes
- **Simple internal tools** - Validation and docs aren't worth the complexity
- **Non-SvelteKit** - This plugin only works with SvelteKit projects
- **SSR-only apps** - You're not building API endpoints

## Next Steps

Ready to get started? Head to the [Quick Start](/introduction/quick-start/) guide to add SvelteKit Auto OpenAPI to your project in 5 minutes.

Want to understand how it works? Explore the [Fundamentals](/fundamentals/) section to learn about the plugin system, route configuration, and documentation UI.
