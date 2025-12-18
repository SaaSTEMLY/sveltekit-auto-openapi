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
bun install sveltekit-auto-openapi
```

Or with npm:

```bash
npm install sveltekit-auto-openapi
```

Or with pnpm:

```bash
pnpm install sveltekit-auto-openapi
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

### 3. Add Validation Hook

Add the hook to `src/hooks.server.ts` to enable runtime validation.

```ts
import { sequence } from "@sveltejs/kit/hooks";
import { createSchemaValidationHook } from "sveltekit-auto-openapi/schema-validation-hook";

export const handle = sequence(
  createSchemaValidationHook({
    validateOutput: import.meta.env.DEV, // Enable response validation in development only
  })
);
```

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
- Configure the [Plugin](/essentials/plugin-configuration/), [Validation Hook](/essentials/schema-validation-hook/), and [Scalar Module](/essentials/scalar-module/)

## Troubleshooting

If you encounter issues, check the [Troubleshooting](/advanced/troubleshooting/) guide or open an issue on [GitHub](https://github.com/MahmoodKhalil57/sveltekit-auto-openapi/issues).
