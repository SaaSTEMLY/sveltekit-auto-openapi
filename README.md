# SvelteKit Auto OpenAPI

<p align="center">
  <img src="https://img.shields.io/npm/v/sveltekit-auto-openapi?style=for-the-badge&color=orange" alt="npm version" />
  <img src="https://img.shields.io/npm/dm/sveltekit-auto-openapi?style=for-the-badge&color=blue" alt="downloads" />
  <img src="https://img.shields.io/bundlejs/size/sveltekit-auto-openapi?style=for-the-badge&color=green" alt="bundle size" />
</p>

[Github](https://github.com/MahmoodKhalil57/sveltekit-auto-openapi)
[NPM](https://www.npmjs.com/package/sveltekit-auto-openapi)

<p align="center">
  <strong>Type-safe OpenAPI generation and runtime validation for SvelteKit.</strong><br/>
  Write standard SvelteKit code, get documented APIs for free.
</p>

> [!WARNING] > **🚧 v0 - Experimental**
>
> This plugin is in early development (v0) and **not recommended for production use**. APIs will most probably change, and there may be undiscovered bugs. Use at your own risk.
>
> **Contributions are welcome!** If you'd like to help improve this project, please feel free to open issues or submit pull requests.

## 🆕 Recent Updates (v0.0.9)

### Production Build Support

- ✅ **Fixed**: `_config` exports (Zod schemas and OpenAPI overrides) are now correctly detected in production builds
- ✅ **Fixed**: Virtual module imports now follow Vite best practices with `virtual:` prefix

Production builds now generate complete OpenAPI schemas with full validation support, not just TypeScript AST inference.

---

## ⚡ Features

- **🔎 Automatic Inference**: Generates OpenAPI schemas by analyzing your `request.json<Type>()` calls.
- **🛡️ Runtime Validation**: Validates Headers, Cookies, Query Params, and Body using JSON Schema (supports [Zod](https://zod.dev)).
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

### 3\. Add Validation Hook

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
        $skipValidation: false,
        schema: z.object({ "x-api-key": z.string() }).toJSONSchema(),
      },

      // Validate request body (standard OpenAPI structure)
      requestBody: {
        content: {
          "application/json": {
            $showErrorMessage: true,
            $skipValidation: false,
            schema: z.object({ email: z.email() }).toJSONSchema(),
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

Don't want to use Zod? You can provide raw JSON Schema objects directly:

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

Read the full documentation at **[docs](https://github.com/MahmoodKhalil57/sveltekit-auto-openapi/blob/main/docs/01-introduction.md)**. -->

## 🔧 Advanced Usage

### Virtual Module Imports

For advanced users who need direct access to generated schemas, virtual modules are available:

```ts
import openApiPaths from "virtual:sveltekit-auto-openapi/schema-paths";
import validationRegistry from "virtual:sveltekit-auto-openapi/schema-validation-map";
```

> **Note**: Most users don't need to import these directly - they're used internally by `ScalarModule` and `SchemaValidationHook`.

### Production Builds

Production builds fully support `_config` exports:

- ✅ Validation schemas (Zod or JSON Schema) are converted at build time
- ✅ OpenAPI overrides with custom validation are applied
- ✅ Complete OpenAPI schemas are generated (not just AST inference)
- ✅ Runtime validation works in production using JSON Schema

The plugin converts Zod schemas to JSON Schema during the build phase, then uses `@cfworker/json-schema` for fast runtime validation.

## 🐛 Debugging

Enable detailed logging during development by setting the `DEBUG_OPENAPI` environment variable:

```bash
DEBUG_OPENAPI=true
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
    - openapiOverride methods: [ 'GET', 'POST' ]

📊 Generated OpenAPI Paths:
  /users:
    GET:
      - summary: List all users
      - parameters: 2
      - responses: 200, 401
      - requestBody: no
```

## Roadmap for version 0

[] Explore edge cases and find errors
[] Optimize vite plugin
[] Expand docs and create a docs website
[] Add proper tests
[] Publish V1

## 📄 License

[MIT](https://github.com/MahmoodKhalil57/sveltekit-auto-openapi/blob/main/LICENSE)
