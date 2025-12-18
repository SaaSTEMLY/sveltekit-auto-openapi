---
title: Type Safety
description: Extract types from route configurations for full type safety
---

# Type Safety

SvelteKit Auto OpenAPI provides utilities for extracting types from your route configurations, enabling full type safety throughout your application.

## RouteTypes Utility

Extract types from your `_config` export:

```ts
import type { RouteConfig, RouteTypes } from "sveltekit-auto-openapi/scalar-module";

export const _config = {
  openapiOverride: {
    POST: {
      requestBody: { /* ... */ },
      responses: { /* ... */ },
    },
  },
} satisfies RouteConfig;

export async function POST({ request }) {
  // Extract request type
  const body = await request.json() as RouteTypes<typeof _config>["_types"]["json"]["POST"];

  // Extract response type
  return json({} satisfies RouteTypes<typeof _config>["_types"]["returns"]["POST"]);
}
```

## Type Inference

Use the `satisfies` pattern for type inference:

```ts
export const _config = {
  // Your config here
} satisfies RouteConfig;
```

This ensures your config matches the `RouteConfig` type while preserving type inference.

## See Also

- [Advanced RouteConfig](/essentials/usage-in-server-routes/advanced-route-config/) for complete examples
- [Automatic AST Inference](/essentials/usage-in-server-routes/automatic-ast-inference/) for type-based schema generation
