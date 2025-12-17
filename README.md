# SvelteKit Auto OpenAPI

<p align="center">
  <img src="https://img.shields.io/npm/v/sveltekit-auto-openapi?style=for-the-badge&color=orange" alt="npm version" />
  <img src="https://img.shields.io/npm/dm/sveltekit-auto-openapi?style=for-the-badge&color=blue" alt="downloads" />
  <img src="https://img.shields.io/bundlejs/size/sveltekit-auto-openapi?style=for-the-badge&color=green" alt="bundle size" />
</p>

<p align="center">
  <strong>Type-safe OpenAPI generation and runtime validation for SvelteKit.</strong><br/>
  Write standard SvelteKit code, get documented APIs for free.
</p>

---

## ⚡ Features

- **🔎 Automatic Inference**: Generates OpenAPI schemas by analyzing your `request.json<Type>()` calls.
- **🛡️ Runtime Validation**: Validates Headers, Cookies, Query Params, and Body using [Zod](https://zod.dev).
- **📘 Interactive Documentation**: Built-in [Scalar](https://scalar.com) integration for beautiful API references.
- **⚡ Zero Boilerplate**: Works directly with standard SvelteKit `+server.ts` files.
- **🔄 Hot Reload**: OpenAPI schemas update instantly as you modify your routes.

## 🚀 Quick Start

### 1. Install

```bash
npm install sveltekit-auto-openapi
```

```bash
pnpm install sveltekit-auto-openapi
```

```bash
bun install sveltekit-auto-openapi
```

**For Scalar API documentation** (optional):

```bash
npm install @scalar/sveltekit
```

### 2\. Add Vite Plugin

Add the plugin to `vite.config.ts` to enable schema generation.

```ts
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";
import svelteOpenApi from "sveltekit-auto-openapi/plugin";

export default defineConfig({
  plugins: [sveltekit(), svelteOpenApi()],
});
```

### 3\. Add Validation Hook

Add the hook to `src/hooks.server.ts` to enable runtime validation.

```ts
import { sequence } from "@sveltejs/kit/hooks";
import SchemaValidationHook from "sveltekit-auto-openapi/schema-validation-hook";

export const handle = sequence(SchemaValidationHook());
```

### 4\. Create API Docs Route

Expose your documentation at `src/routes/api-docs/[slug]/+server.ts`.

> **Note:** This requires installing `@scalar/sveltekit` (see step 1).

```ts
import ScalarModule from "sveltekit-auto-openapi/scalar-module";

const scalar = ScalarModule({
  openApiOpts: {
    openapi: "3.0.0",
    info: { title: "My App API", version: "1.0.0" },
  },
});

export const { GET } = scalar;
```

### 5\. Visit docs

Thats it! Visit your docs at `/api-docs/scalar`

---

## 💡 Usage Scenarios

### Level 1: Automatic (AST Inference)

Just write your code. We infer the schema from your generic types.

```ts
// src/routes/api/auth/+server.ts
import { json } from "@sveltejs/kit";

export async function POST({ request }) {
  // The schema is automatically generated from the type!
  const { email }: { email: string } = await request.json();
  console.log("🚀 ~ POST ~ email:", email);
  return json({ success: true });
}
```

### Level 2: Strict (Zod Validation)

Export a `_config` object to enforce runtime validation and detailed docs.

```ts
import { json } from "@sveltejs/kit";
import z from "zod";

export const _config = {
  // Define standard schema for automatic validation and documentation
  standardSchema: {
    POST: {
      input: {
        body: z.object({ email: z.email() }),
        headers: z.object({ "x-api-key": z.string() }),
      },
      output: {
        "200": {
          body: z.object({
            success: z.boolean(),
          }),
        },
      },
    },
  },
};

export async function POST({ request }) {
  const { email }: { email: string } = await request.json();
  console.log("🚀 ~ POST ~ email:", email);
  return json({ success: true });
}
```

### Level 3: Manual (OpenAPI Override)

Need full control? Override specific parts of the OpenAPI spec manually.

```ts
import { json } from "@sveltejs/kit";
import z from "zod";

export const _config = {
  // Add manual OpenAPI documentation overrides and standard schema definitions
  openapiOverride: {
    POST: {
      summary: "Legacy Endpoint",
      description: "Manually documented endpoint.",
    },
  },
};

export async function POST({ request }) {
  // The schema is automatically generated from the type
  const { email }: { email: string } = await request.json();
  console.log("🚀 ~ POST ~ email:", email);
  return json({ success: true });
}
```

## 📚 Documentation

Read the full documentation at **[your-docs-site.com](https://www.google.com/search?q=https://your-docs-site.com)**.

## 🐛 Debugging

Enable detailed logging during development by setting the `DEBUG_OPENAPI` environment variable:

```bash
DEBUG_OPENAPI=true bun dev
# or
DEBUG_OPENAPI=true npm run dev
```

This will show:

- Which route files are being processed
- SSR module loading status
- Found `_config` objects and their methods
- Complete generated OpenAPI schema with all paths and operations
- Virtual module invalidation events

Example output:

```
Accessing SSR module: src/routes/users/+server.ts
  ✓ Found _config in src/routes/users/+server.ts
    - standardSchema methods: [ 'GET', 'POST' ]
    - openapiOverride methods: [ 'GET' ]

📊 Generated OpenAPI Paths:
  /users:
    GET:
      - summary: List all users
      - parameters: 2
      - responses: 200, 401
      - requestBody: no
```

## Roadmap

[] Make sure \_config gets detected after build
[] Allow openapi to have standard schema (and zod for more options)
[] Add openapi validation and remove the external standard schema

## 📄 License

[MIT](https://www.google.com/search?q=./LICENSE)
