---
title: Quick Start
description: Get started with SvelteKit Auto OpenAPI in 5 minutes
---

# Quick Start

Get SvelteKit Auto OpenAPI up and running in your project in just 5 steps.

## Prerequisites

- An existing SvelteKit project
- Node.js 18+ or Bun

## Installation

Install the package as a dev dependency:

```bash
# npm
npm install -D sveltekit-auto-openapi

# pnpm
pnpm install -D sveltekit-auto-openapi

# bun
bun install -D sveltekit-auto-openapi
```

## Setup (5 Steps)

### Step 1: Add the Vite Plugin

Add the plugin to your `vite.config.ts`:

```typescript
// vite.config.ts
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import svelteOpenApi from 'sveltekit-auto-openapi/plugin';

export default defineConfig({
  plugins: [
    sveltekit(),
    svelteOpenApi(),  // ← Add this
  ],
});
```

### Step 2: Add Type Generation

Add the type generator to your `svelte.config.js`:

```javascript
// svelte.config.js
import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { generateAutoOpenApiTypes } from 'sveltekit-auto-openapi/sync-helper';

generateAutoOpenApiTypes();  // ← Add this before config

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter()
  }
};

export default config;
```

This ensures your route handlers get proper TypeScript types for `validated`, `json()`, and `error()` helpers.

### Step 3: Create API Documentation Route

Create a route to serve your OpenAPI schema and documentation UI:

```typescript
// src/routes/api-docs/[slug]/+server.ts
import ScalarModule from 'sveltekit-auto-openapi/scalar-module';

export const { GET, _config } = ScalarModule({
  openApiOpts: {
    openapi: '3.0.0',
    info: {
      title: 'My API',
      version: '1.0.0',
      description: 'My awesome API built with SvelteKit'
    },
  },
});
```

### Step 4: Write Your First API Route

Create a simple API endpoint:

```typescript
// src/routes/api/hello/+server.ts
import { json } from '@sveltejs/kit';

export async function POST({ request }) {
  const { name }: { name: string } = await request.json();
  return json({ message: `Hello, ${name}!` });
}
```

That's it! The plugin will automatically:
- Detect the endpoint
- Infer the schema from type annotations
- Generate OpenAPI documentation

### Step 5: Visit Your Documentation

Start your development server:

```bash
bun run dev
```

Navigate to http://localhost:5173/api-docs/scalar to see your interactive API documentation powered by [Scalar](https://scalar.com).

You can also access the raw OpenAPI JSON at http://localhost:5173/api-docs/openapi.json

## What Just Happened?

The plugin performed three key operations:

1. **Scanned your routes** - Found all `+server.ts` files
2. **Analyzed the code** - Read type annotations from `request.json<Type>()`
3. **Generated schemas** - Created OpenAPI PathsObject for each route

All without requiring any configuration from you!

## Next Steps

### Add Runtime Validation

Want to validate requests at runtime? Add a `_config` export:

```typescript
// src/routes/api/hello/+server.ts
import type { RouteConfig } from 'sveltekit-auto-openapi/types';

export const _config = {
  openapiOverride: {
    POST: {
      summary: 'Greet user',
      requestBody: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                name: { type: 'string', minLength: 1 }
              },
              required: ['name']
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'Success',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  message: { type: 'string' }
                }
              }
            }
          }
        }
      }
    }
  }
} satisfies RouteConfig;

export async function POST({ validated, json, error }) {
  const { name } = validated.body;  // ← Now validated!

  if (!name) {
    error(400, { message: 'Name is required' });
  }

  return json({ message: `Hello, ${name}!` });
}
```

Now the plugin will:
- Validate incoming requests against the schema
- Return 400 errors for invalid requests
- Provide type-safe access via `validated.body`
- Inject typed `json()` and `error()` helpers

### Learn the Fundamentals

- [Plugin Configuration](/fundamentals/plugin/) - Configure the Vite plugin options
- [Route Configuration](/fundamentals/route-config/) - Learn about `_config` and OpenAPI schemas
- [Scalar Module](/fundamentals/scalar-module/) - Customize your documentation UI

### Explore Advanced Features

- [Validation Guide](/guides/validation/) - Use Zod, TypeBox, Valibot, or ArkType
- [Type System](/advanced/type-system/) - Understanding TypeScript integration
- [Virtual Modules](/advanced/virtual-modules/) - Access generated schemas programmatically

## Troubleshooting

### Types not showing up

Run SvelteKit's sync command to regenerate types:

```bash
bunx svelte-kit sync
```

### Documentation not updating

The virtual module is cached. Restart your dev server:

```bash
# Stop server (Ctrl+C) then restart
bun run dev
```

### Validation not working

Make sure you:
1. Exported `_config` from your route
2. Use the injected helpers: `validated`, `json()`, `error()`
3. Restarted the dev server after adding `_config`

Need more help? Check the [full documentation](/fundamentals/) or [open an issue on GitHub](https://github.com/SaaSTEMLY/sveltekit-auto-openapi/issues).
