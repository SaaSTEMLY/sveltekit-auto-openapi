---
title: Usage in +server.ts
description: Learn how to use SvelteKit Auto OpenAPI in your route handlers
---

# Usage in +server.ts

SvelteKit Auto OpenAPI supports two main usage patterns for defining your API routes.

## Two Levels of Usage

### [Automatic (AST Inference)](/essentials/usage-in-server-routes/automatic-ast-inference/)

Write standard SvelteKit code with TypeScript types. Schemas are inferred automatically from your type annotations.

**Best for:**
- Simple API routes
- Rapid prototyping
- When you don't need runtime validation

```ts
export async function POST({ request }) {
  const { email }: { email: string } = await request.json();
  return json({ success: true });
}
```

### [Advanced (_config RouteConfig)](/essentials/usage-in-server-routes/advanced-route-config/)

Export a `_config` object with detailed schemas, validation rules, and documentation.

**Best for:**
- Production APIs
- Routes requiring validation
- Detailed API documentation

```ts
export const _config = {
  openapiOverride: {
    POST: {
      summary: "Create user",
      requestBody: { /* schema */ },
      responses: { /* schema */ },
    },
  },
} satisfies RouteConfig;

export async function POST({ request }) {
  // Request is already validated!
  const { email } = await request.json();
  return json({ success: true });
}
```

## Choose Your Approach

Start with automatic inference and upgrade to `_config` when you need:
- Runtime validation
- Detailed error messages
- Custom documentation
- Header/cookie/query validation

## Next Steps

- Learn about [Automatic AST Inference](/essentials/usage-in-server-routes/automatic-ast-inference/)
- Explore [Advanced RouteConfig](/essentials/usage-in-server-routes/advanced-route-config/)
