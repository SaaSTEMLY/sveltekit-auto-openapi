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
import { json } from "@sveltejs/kit";

export async function POST({ request }) {
  // The schema is automatically generated from the type!
  const { email }: { email: string } = await request.json();
  console.log("🚀 ~ POST ~ email:", email);
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
          $_returnDetailedError: true,
          schema: z.object({ "x-api-key": z.string() }).toJSONSchema(),
        },
        content: {
          "application/json": {
            $_returnDetailedError: true,
            schema: z.object({ email: z.string().email() }).toJSONSchema(),
          },
        },
      },

      // Validate responses (standard OpenAPI structure)
      responses: {
        "200": {
          description: "Success",
          content: {
            "application/json": {
              $_returnDetailedError: true,
              schema: z.object({ success: z.boolean() }).toJSONSchema(),
            },
          },
        },
      },
    },
  },
} satisfies RouteConfig;

export async function POST({ validated, json, error }) {
  const { email } = validated;
  if (email !== "example@test.com") {
    error(404, {
      message: "User not found",
    });
  }
  return json({ success: true });
}
```

**Validation Flags:**

- `$_returnDetailedError` - Show detailed validation errors (defaults to `false`)
- `$_skipValidation` - Skip validation for this schema (defaults to `false`)

**Supported Validation Properties:**

- `requestBody.$headers` - Validate and add schema for request headers
- `requestBody.$query` - Validate and add schema for request query parameters
- `requestBody.$pathParams` - Validate and add schema for request path parameters
- `requestBody.$cookies` - Validate and add schema for request cookies
- `requestBody.content['application/json']` - Validate request body
- `responses[statusCode].content['application/json']` - Validate response body
- `responses[statusCode].$headers` - Validate and add schema for response headers
- `responses[statusCode].$cookies` - Validate and add schema for response cookies

### Level 3: Using Raw JSON Schema

Don't want to use StandardShema? You can provide raw JSON Schema objects directly:

```ts
import { json } from "@sveltejs/kit";
import type { RouteConfig } from "sveltekit-auto-openapi/types";

export const _config = {
  openapiOverride: {
    POST: {
      post: {
        tags: ["Default"],

        // "parameters" property does not get validated, use requestBody.$headers/requestBody.$pathParameters/requestBody.$query/requestBody.$cookies to enable validation
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
              $_returnDetailedError: true,
              $_skipValidation: false,
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
                $schema: "https://json-schema.org/draft/2020-12/schema",
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Success",
            content: {
              "application/json": {
                $_returnDetailedError: true,
                $_skipValidation: false,
                schema: {
                  type: "object",
                  properties: {
                    success: {
                      type: "boolean",
                    },
                  },
                  required: ["success"],
                  additionalProperties: false,
                  $schema: "https://json-schema.org/draft/2020-12/schema",
                },
              },
            },
          },
        },
        summary: "Create user",
        description: "Creates a new user with email",
      },
    },
  },
} satisfies RouteConfig;

export async function POST({ validated, json, error }) {
  const { email } = validated;
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
