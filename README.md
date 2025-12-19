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
[Website](www.sveltekit-auto-openapi.saastemly.com)

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
npm install sveltekit-auto-openapi
```

```bash
pnpm install sveltekit-auto-openapi
```

```bash
bun install sveltekit-auto-openapi
```

### 2\. Add Vite Plugin

Add the plugin to `vite.config.ts` to enable schema and validationmap generation.

```ts
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";
import svelteOpenApi from "sveltekit-auto-openapi/plugin";

export default defineConfig({
  plugins: [sveltekit(), svelteOpenApi()],
});
```

**Plugin Options:**

```ts
svelteOpenApi({
  skipSchemaGeneration: false, // Skip OpenAPI schema generation (default: false)
  skipValidationMapGeneration: false, // Skip validation map generation (default: false)
})
```

- `skipSchemaGeneration` - Set to `true` to disable OpenAPI schema generation. Useful if you only want runtime validation without documentation.
- `skipValidationMapGeneration` - Set to `true` to disable validation map generation. Useful if you only want OpenAPI docs without runtime validation.

### 3\. Add Runtime Validation (Choose One)

You have two options for runtime validation:

#### Option A: Global Validation Hook (Simple Setup)

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

**Note:** This approach loads all validation schemas into memory at startup. For better performance, consider Option B.

#### Option B: Per-Route Validation with `useValidation` (Recommended for Performance)

Use `useValidation` in individual routes for optimized validation that only loads schemas when needed:

```ts
import { useValidation } from "sveltekit-auto-openapi/request-handler";
import type { RouteConfig } from "sveltekit-auto-openapi/request-handler";
import z from "zod";

export const _config = {
  openapiOverride: {
    POST: {
      summary: "Create user",
      requestBody: {
        content: {
          "application/json": {
            schema: z.object({ email: z.string().email() }).toJSONSchema(),
          },
        },
      },
      responses: {
        "200": {
          description: "Success",
          content: {
            "application/json": {
              schema: z.object({ success: z.boolean() }).toJSONSchema(),
            },
          },
        },
      },
    },
  },
} satisfies RouteConfig;

export const POST = useValidation("POST", _config, async ({ validated }) => {
  // Access validated inputs directly
  const { body } = validated;

  // Your handler logic here
  return json({ success: true });
});
```

**Benefits:**
- ⚡ **Memory efficient** - Only loads validation schemas for the current route
- 🎯 **Better performance** - No global validation registry loaded into memory
- 🔒 **Type-safe** - Full TypeScript support with `validated` inputs
- 🎨 **Cleaner code** - Validation logic co-located with routes

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

#### Using `useValidation` (Recommended)

The `useValidation` wrapper provides optimized per-route validation with full type safety:

```ts
import { useValidation } from "sveltekit-auto-openapi/request-handler";
import type { RouteConfig } from "sveltekit-auto-openapi/request-handler";
import { json } from "@sveltejs/kit";
import z from "zod";

export const _config = {
  openapiOverride: {
    POST: {
      summary: "Create user",
      description: "Creates a new user with email",

      // Validate custom properties with $ prefix
      $headers: {
        $showErrorMessage: true,
        schema: z.object({ "x-api-key": z.string() }).toJSONSchema(),
      },

      // Validate request body (standard OpenAPI structure)
      requestBody: {
        content: {
          "application/json": {
            $showErrorMessage: true,
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
              $showErrorMessage: true,
              schema: z.object({ success: z.boolean() }).toJSONSchema(),
            },
          },
        },
      },
    },
  },
} satisfies RouteConfig;

export const POST = useValidation("POST", _config, async ({ validated }) => {
  // Access fully typed, pre-validated inputs
  const { body, headers } = validated;
  console.log("🚀 ~ POST ~ email:", body.email);

  // Return type-safe response
  return json({ success: true });
});
```

#### Using Global Hook

Alternatively, use the global validation hook approach (requires `createSchemaValidationHook` in hooks.server.ts):

```ts
import type {
  RouteConfig,
  RouteTypes,
} from "sveltekit-auto-openapi/scalar-module";
import { json } from "@sveltejs/kit";
import z from "zod";

export const _config = {
  openapiOverride: {
    POST: {
      summary: "Create user",
      description: "Creates a new user with email",

      // Validate custom properties with $ prefix
      $headers: {
        $showErrorMessage: true,
        schema: z.object({ "x-api-key": z.string() }).toJSONSchema(),
      },

      // Validate request body (standard OpenAPI structure)
      requestBody: {
        content: {
          "application/json": {
            $showErrorMessage: true,
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
              $showErrorMessage: true,
              schema: z.object({ success: z.boolean() }).toJSONSchema(),
            },
          },
        },
      },
    },
  },
} satisfies RouteConfig;

export async function POST({ request }) {
  // Request is already validated by the hook!
  const { email } = (await request.json()) as RouteTypes<
    typeof _config
  >["_types"]["json"]["POST"];

  console.log("🚀 ~ POST ~ email:", email);

  return json({ success: true } satisfies RouteTypes<
    typeof _config
  >["_types"]["returns"]["POST"]);
}
```

**Validation Flags:**

- `$showErrorMessage` - Show detailed validation errors (defaults to `true` in dev, `false` in prod)
- `$skipValidation` - Skip validation for this schema (defaults to `false`)

**Supported Validation Properties:**

- `$headers` - Validate request headers
- `$query` - Validate query parameters
- `$pathParams` - Validate path parameters
- `$cookies` - Validate cookies
- `requestBody.content['application/json']` - Validate request body
- `responses[statusCode].content['application/json']` - Validate response body

### Level 3: Using Raw JSON Schema

Don't want to use StandardShema? You can provide raw JSON Schema objects directly:

```ts
import type {
  RouteConfig,
  RouteTypes,
} from "sveltekit-auto-openapi/scalar-module";
import { json } from "@sveltejs/kit";

export const _config = {
  openapiOverride: {
    POST: {
      post: {
        tags: ["Default"],

        // this does not get validated, use $headers/$pathParameters/$query/$cookies to enable validation
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
              $showErrorMessage: true,
              $skipValidation: false,
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
                $showErrorMessage: true,
                $skipValidation: false,
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

export async function POST({ request }) {
  // Request is already validated by the hook!
  const { email } = (await request.json()) as RouteTypes<
    typeof _config
  >["_types"]["json"]["POST"];
  console.log("🚀 ~ POST ~ email:", email);
  return json({ success: true } satisfies RouteTypes<
    typeof _config
  >["_types"]["returns"]["POST"]);
}
```

<!-- ## 📚 Documentation

Read the full documentation at **[docs](https://github.com/SaaSTEMLY/sveltekit-auto-openapi/blob/main/docs/01-introduction.md)**. -->

## 🔧 Advanced Usage

### Virtual Module Imports

For advanced users who need direct access to generated schemas, virtual modules are available:

```ts
import openApiPaths from "virtual:sveltekit-auto-openapi/schema-paths";
import validationRegistry from "virtual:sveltekit-auto-openapi/schema-validation-map";
```

> **Note**: Most users don't need to import these directly - they're used internally by `ScalarModule` and `SchemaValidationHook`.

## Roadmap for version 0

- [] Explore edge cases and find errors
- [] Optimize vite plugin
- [] Expand docs and create a docs website
- [] Add proper tests
- [] Publish V1

## 📄 License

[MIT](https://github.com/SaaSTEMLY/sveltekit-auto-openapi/blob/main/LICENSE)
