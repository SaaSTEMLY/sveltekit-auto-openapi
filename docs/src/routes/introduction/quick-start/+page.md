---
title: Quick Start
description: Get up and running with SvelteKit Auto OpenAPI in 5 minutes
---

# Quick Start

Get up and running with SvelteKit Auto OpenAPI in 5 simple steps.

## Prerequisites

- A SvelteKit project (create one with `npx sv create my-app`)
- Bun, npm, or pnpm installed

## Installation Steps

### 1. Install

```bash
bun install -D sveltekit-auto-openapi
```

Or with npm:

```bash
npm install -D sveltekit-auto-openapi
```

Or with pnpm:

```bash
pnpm install -D sveltekit-auto-openapi
```

### 2. Add Vite Plugin

Add the plugin to `vite.config.ts` to enable schema and validation map generation.

```ts
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";
import svelteOpenApi from "sveltekit-auto-openapi/plugin";

export default defineConfig({
  plugins: [sveltekit(), svelteOpenApi()],
});
```

### 3. Add Runtime Validation (Optional)

You have two options for runtime validation:

#### Option A: Global Validation Hook

Add the hook to `src/hooks.server.ts` to enable validation for all routes:

```ts
import { sequence } from "@sveltejs/kit/hooks";
import { createSchemaValidationHook } from "sveltekit-auto-openapi/schema-validation-hook";

export const handle = sequence(
  createSchemaValidationHook({
    validateOutput: import.meta.env.DEV, // Enable response validation in development only
  })
);
```

> **Note:** This loads all validation schemas into memory. For better performance, see Option B.

#### Option B: Per-Route with `useValidation` (Recommended for Performance)

Use `useValidation` in individual routes for optimized, per-route validation. See [useValidation](/essentials/use-validation/) for details.

```ts
// src/routes/api/users/+server.ts
import { useValidation } from "sveltekit-auto-openapi/request-handler";
import type { RouteConfig } from "sveltekit-auto-openapi/request-handler";

export const _config = {
  /* ... */
} satisfies RouteConfig;

export const POST = useValidation(
  "POST",
  _config,
  async ({ validated, json, error }) => {
    // Access validated inputs with full type safety
    const { body } = validated;
    return json({ success: true });
  }
);
```

> **Skip this step** if you only want OpenAPI documentation without runtime validation.

### 4. Create API Docs Route

Expose your documentation at `src/routes/api-docs/[slug]/+server.ts`.

```ts
import ScalarModule from "sveltekit-auto-openapi/scalar-module";

export const { GET, _config } = ScalarModule({
  openApiOpts: {
    openapi: "3.0.0",
    info: { title: "My App API", version: "1.0.0" },
  },
});
```

### 5. Visit Your Docs

That's it! Start your development server:

```bash
bun run dev
```

Visit your interactive API documentation at:

```
http://localhost:5173/api-docs/scalar
```

And access the OpenAPI JSON schema at:

```
http://localhost:5173/api-docs/openapi.json
```

## Create Your First API Route

Now create a simple API route at `src/routes/api/hello/+server.ts`:

```ts
import { json } from "@sveltejs/kit";

export async function POST({ request }) {
  const { name }: { name: string } = await request.json();
  return json({ message: `Hello, ${name}!` });
}
```

The OpenAPI schema will be automatically generated from your TypeScript types! Check your `/api-docs/scalar` endpoint to see it.

## Next Steps

- Learn about [Automatic AST Inference](/essentials/usage-in-server-routes/automatic-ast-inference/) to understand how schemas are generated
- Explore [Advanced RouteConfig](/essentials/usage-in-server-routes/advanced-route-config/) to add runtime validation
- Use [useValidation](/essentials/use-validation/) for optimized per-route validation
- Configure the [Plugin](/essentials/plugin-configuration/), [Validation Hook](/essentials/schema-validation-hook/), and [Scalar Module](/essentials/scalar-module/)
- Check out the [Live Example](https://www.basic.example.sveltekit-auto-openapi.saastemly.com) and its [source code](https://github.com/SaaSTEMLY/sveltekit-auto-openapi/tree/main/examples/basic)

## Troubleshooting

If you encounter issues, check the [Troubleshooting](/advanced/troubleshooting/) guide or open an issue on [GitHub](https://github.com/SaaSTEMLY/sveltekit-auto-openapi/issues).
