# SvelteKit Auto OpenAPI

<p align="center">
  <img src="https://img.shields.io/npm/v/sveltekit-auto-openapi?style=for-the-badge&color=orange" alt="npm version" />
  <img src="https://img.shields.io/npm/dm/sveltekit-auto-openapi?style=for-the-badge&color=blue" alt="downloads" />
  <img src="https://img.shields.io/bundlejs/size/sveltekit-auto-openapi?style=for-the-badge&color=green" alt="bundle size" />
</p>

<p align="center">
  <img src="https://www.sveltekit-auto-openapi.saastemly.com/logo/main/pwa-512x512.png" alt="Logo" />
</p>

[Github](https://github.com/SaaSTEMLY/sveltekit-auto-openapi)

[NPM](https://www.npmjs.com/package/sveltekit-auto-openapi)

[Website](https://www.sveltekit-auto-openapi.saastemly.com)

[Example](https://www.basic.example.sveltekit-auto-openapi.saastemly.com)

<p align="center">
  <strong>Type-safe OpenAPI generation and runtime validation for SvelteKit.</strong><br/>
  Write standard SvelteKit code, get documented APIs for free.
</p>

> [!WARNING] > **🚧 v0 - Experimental**
>
> This plugin is in early development (v0) and **not recommended for production use**. APIs will most probably change, and there may be undiscovered bugs. Use at your own risk.
>
> **Contributions are welcome!** If you'd like to help improve this project, please feel free to open issues or submit pull requests.

---

## ⚡ Features

- **🔎 Automatic Inference**: Generates OpenAPI schemas by analyzing your `request.json<Type>()` calls.
- **🛡️ Runtime Validation**: Validates Headers, Cookies, Query Params, and Body using JSON Schema - supports [StandardSchema](https://standardschema.dev/schema) schemas aka. Zod/TypeBox/Valibot/ArkType etc.
- **📘 Interactive Documentation**: Built-in [Scalar](https://scalar.com) integration for beautiful API references.
- **⚡ Zero Boilerplate**: Works directly with standard SvelteKit `+server.ts` files.
- **🔄 Hot Reload**: OpenAPI schemas update instantly as you modify your routes.

## 🚀 Quick Start

### 1. Install

```bash
npm install -D sveltekit-auto-openapi
```

```bash
pnpm install -D sveltekit-auto-openapi
```

```bash
bun install -D sveltekit-auto-openapi
```

### 2\. Add Vite Plugin

Add the plugin to `vite.config.ts` to enable schema generation.

```diff
  import { sveltekit } from "@sveltejs/kit/vite";
  import { defineConfig } from "vite";
+ import svelteOpenApi from "sveltekit-auto-openapi/plugin";

  export default defineConfig({
    plugins: [
      sveltekit(),
+     svelteOpenApi(),
    ],
  });
```

### 3\. Add generateAutoOpenApiTypes

Import and run the function in `svelte.config.js` to automatically generate types on sync

```diff
  import adapter from '@sveltejs/adapter-vercel';
  // ...imports
+ import { generateAutoOpenApiTypes } from "sveltekit-auto-openapi/sync-helper";

+ generateAutoOpenApiTypes();

  /** @type {import('@sveltejs/kit').Config} */
  const config = {
    // ...sveltekit config
  };

  export default config;
```

### 4\. Create API Docs Route

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

### 5\. Visit docs

Thats it! Visit your docs at `/api-docs/scalar`

---

## 📚 Examples

Check out the **[Basic Example](https://www.basic.example.sveltekit-auto-openapi.saastemly.com)** to see SvelteKit Auto OpenAPI in action.

View the [example source code](https://github.com/SaaSTEMLY/sveltekit-auto-openapi/tree/main/examples/basic) to learn how it's implemented.

---

## 💡 Usage Scenarios

### Level 1: Automatic (AST Inference)

Just write your code. We infer the schema from your generic types.

```ts
// src/routes/api/auth/+server.ts
import { error, json } from "@sveltejs/kit";

export async function POST({ request }) {
  const { email }: { email: string } = await request.json();
  if (email !== "example@test.com") {
    error(404, {
      message: "User not found",
    });
  }
  return json({ success: true });
}
```

### Level 2: Strict (Runtime Validation)

Export a `_config` object with validation schemas to enforce runtime validation and generate detailed docs.

```ts
import z from "zod";
import type { RouteConfig } from "sveltekit-auto-openapi/types";

export const _config = {
  openapiOverride: {
    POST: {
      summary: "Create user",
      description: "Creates a new user with email",

      // Validate request body (standard OpenAPI structure)
      requestBody: {
        // Validate custom properties with $ prefix
        $headers: {
          schema: z.looseObject({ "x-api-key": z.string() }),
        },
        content: {
          "application/json": {
            schema: z.object({ email: z.email() }),
          },
        },
      },

      // Validate responses (standard OpenAPI structure)
      responses: {
        "200": {
          description: "Success",
          content: {
            "application/json": {
              schema: z.object({
                success: z.literal(true),
              }),
            },
          },
        },
        "404": {
          description: "Success",
          content: {
            "application/json": {
              schema: z.object({
                message: z.string(),
              }),
            },
          },
        },
      },
    },
  },
} satisfies RouteConfig;

export async function POST({ validated, json, error }) {
  const { email } = validated.body;
  if (email !== "example@test.com") {
    error(404, {
      message: "User not found",
    });
  }
  return json({ success: true });
}
```

### Level 3: Using Raw JSON Schema

Don't want to use StandardShema? You can provide raw JSON Schema objects directly:

```ts
import type { RouteConfig } from "sveltekit-auto-openapi/types";

export const _config = {
  openapiOverride: {
    POST: {
      summary: "Create user",
      description: "Creates a new user with email",

      parameters: [
        {
          name: "x-api-key",
          in: "header",
          required: true,
          schema: {
            type: "string",
          },
        },
      ],
      requestBody: {
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                email: {
                  type: "string",
                  format: "email",
                  pattern:
                    "^(?!\\.)(?!.*\\.\\.)([A-Za-z0-9_'+\\-\\.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9\\-]*\\.)+[A-Za-z]{2,}$",
                },
              },
              required: ["email"],
              additionalProperties: false,
            },
          },
        },
      },
      responses: {
        "200": {
          description: "Success",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: {
                    type: "boolean",
                    const: true,
                  },
                },
                required: ["success"],
                additionalProperties: false,
              },
            },
          },
        },
        "404": {
          description: "Success",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  message: {
                    type: "string",
                  },
                },
                required: ["message"],
                additionalProperties: false,
              },
            },
          },
        },
      },
    },
  },
} satisfies RouteConfig;

export async function POST({ validated, json, error }) {
  const { email } = validated.body;
  if (email !== "example@test.com") {
    error(404, {
      message: "User not found",
    });
  }
  return json({ success: true });
}
```

<!-- ## 📚 Documentation

Read the full documentation at **[docs](https://github.com/SaaSTEMLY/sveltekit-auto-openapi/blob/main/docs/01-introduction.md)**. -->

## 🔧 Advanced Usage

### Virtual Module Imports

For advanced users who need direct access to generated schemas, virtual modules are available:

```ts
import openApiPaths from "virtual:sveltekit-auto-openapi/schema-paths";
```

> **Note**: Most users don't need to import these directly - they're used internally by the plugin.

## Roadmap for version 0

- [] Explore edge cases and find errors
- [] Optimize vite plugin
- [] Expand docs and create a docs website
- [] Add proper tests
- [] Publish V1

## 📄 License

[MIT](https://github.com/SaaSTEMLY/sveltekit-auto-openapi/blob/main/LICENSE)
