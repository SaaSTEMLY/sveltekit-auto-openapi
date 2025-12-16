# sveltekit-auto-openapi

<!-- automd:badges bundlejs -->

[![npm version](https://img.shields.io/npm/v/sveltekit-auto-openapi)](https://npmjs.com/package/sveltekit-auto-openapi)
[![npm downloads](https://img.shields.io/npm/dm/sveltekit-auto-openapi)](https://npm.chart.dev/sveltekit-auto-openapi)
[![bundle size](https://img.shields.io/bundlejs/size/sveltekit-auto-openapi)](https://bundlejs.com/?q=sveltekit-auto-openapi)

<!-- /automd -->

## Install

<!-- automd:pm-i -->

```sh
# ✨ Auto-detect
npx nypm install sveltekit-auto-openapi

# npm
npm install sveltekit-auto-openapi

# yarn
yarn add sveltekit-auto-openapi

# pnpm
pnpm install sveltekit-auto-openapi

# bun
bun install sveltekit-auto-openapi

# deno
deno install sveltekit-auto-openapi
```

<!-- /automd -->

## Setup

### Generate openapi schema

Add the plugin to `vite.config.ts` to generate openapi schema

```ts
// vite.config.ts
import svelteOpenApi from "sveltekit-auto-openapi/plugin";

export default defineConfig({
  plugins: [
    // ...
    svelteOpenApi(),
  ],
});
```

### Host schema with scalar

Add the ScalarModule to `src/routes/api-docs/[slug]/+server.ts` to host openapi schema and scalar docs

```ts
// src/routes/api-docs/[slug]/+server.ts
import ScalarModule from "sveltekit-auto-openapi/scalar-module";

const scalarModule = ScalarModule({
  openApiOpts: {
    openapi: "3.0.0",
    info: {
      title: "My API",
      version: "1.0.0",
    },
  },
});

export const _config = scalarModule._config;
export const GET = scalarModule.GET;
```

### Validate server schemas

Add the SchemaValidationHook to `src/hooks.server.ts` to run request and response validation

```ts
// src/hooks.server.ts
import { sequence } from "@sveltejs/kit/hooks";
import SchemaValidationHook from "sveltekit-auto-openapi/schema-validation-hook";

const schemaValidationHook = SchemaValidationHook();

export const handle = sequence(
  //...
  schemaValidationHook
);
```

## Usage

### Defining Validation Schemas (minimal changes)

Schemas get automatically inferred from the route
To be able to generate input schema, make sure to provide the type in the json generic `await request.json<INPUT_TYPE>()`

```ts
// src/routes/api/users/+server.ts
import { json } from "@sveltejs/kit";

export async function POST({ request }) {
  const { description } = await request.json<{ description: string }>();

  return json({ description }, { status: 201 });
}
```

### Defining Validation Schemas (recommended)

You can also define schemas for route validation and more consistent schema infrence

```ts
// src/routes/api/users/[id]/+server.ts
import { json } from "@sveltejs/kit";
import { z } from "zod";

export const _config = {
  validation: {
    POST: {
      input: {
        body: z.object({
          username: z.string().min(3),
          email: z.string().email(),
          age: z.number().int().optional(),
        }),
      },
      output: {
        "200": {
          body: z.object({
            id: z.string().uuid(),
            username: z.string(),
          }),
        },
        "400": {
          body: z.object({
            error: z.string(),
          }),
        },
      },
    },
  },
} satisfies RouteConfig;

export async function GET({ params, url }) {
  // All validations happen automatically before this handler runs
  // params.id is guaranteed to be a valid UUID
  // url.searchParams are validated
  // headers are validated

  // Your logic here...

  return json(
    { id: params.id, username: "john", email: "john@example.com" },
    {
      headers: {
        "x-rate-limit-remaining": "99",
      },
    }
  );
}
```

### Defining Openapi manually (highly customizable)

You can also define schemas for route validation and more consistent schema infrence

```ts
// src/routes/api/users/[id]/+server.ts
import { json } from "@sveltejs/kit";
import { z } from "zod";

export const _config = {
  openapi: {
    GET: {
      summary: "Get user by ID",
      description: "Retrieves a user by their unique ID.",
      tags: ["Users"],
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string", format: "uuid" },
          description: "The unique identifier of the user.",
        },
        {
          name: "include",
          in: "query",
          required: false,
          schema: { type: "string", enum: ["posts", "comments"] },
          description: "Related data to include in the response.",
        },
        {
          name: "limit",
          in: "query",
          required: false,
          schema: { type: "integer", minimum: 1, maximum: 100, default: 10 },
          description: "Maximum number of related items to return.",
        },
        {
          name: "authorization",
          in: "header",
          required: true,
          schema: { type: "string" },
          description: "Bearer token for authentication.",
        },
      ],
      responses: {
        "200": {
          description: "Successful response with user data.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  id: { type: "string", format: "uuid" },
                  username: { type: "string" },
                  email: { type: "string", format: "email" },
                },
                required: ["id", "username", "email"],
              },
            },
          },
          headers: {
            "x-rate-limit-remaining": {
              description:
                "The number of requests remaining in the current rate limit window.",
              schema: { type: "string" },
            },
          },
        },
        "404": {
          description: "User not found.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  error: { type: "string" },
                },
                required: ["error"],
              },
            },
          },
        },
      },
    },
  },
};

export async function GET({ params, url }) {
  // Validations dont apply from openapi scheme

  // Your logic here...

  return json(
    { id: params.id, username: "john", email: "john@example.com" },
    {
      headers: {
        "x-rate-limit-remaining": "99",
      },
    }
  );
}
```

### Note

All three methods above can exist in the same file as they merge together (Openapi > standard-schema > AST) to produce the final schema and validation.

## Goodies

### Importing the Schema

You can import the generated OpenAPI schema directly in your code if needed:
`For displaying openapi schema, it is recommended to use ScalarModule instead if possible`

```ts
import openApiSchemaPaths from "sveltekit-auto-openapi/virtual/schema-paths";

// Use the schema paths in your application
console.log(openApiSchemaPaths);
```

```ts
import openApiSchemaValidationMap from "sveltekit-auto-openapi/virtual/schema-validation-map";

// Use the openApiSchemaValidationMap in your application, it contains all route validations in 1 big object
console.log(openApiSchemaValidationMap);
```

The schema is generated as a virtual module during development and written to disk during build. It automatically updates when your API routes change.

## Roadmap

[x] Create hook for auto validating the input and output schemas if defined

```
🔮 Future Enhancements (as planned)
The MVP is complete. Future additions can include:
Config-based detailed error exposure per route
Schema caching for better performance
Custom error formatters
Route filtering (skipRoutes, onlyRoutes)
All changes are ready to be committed!
```

[] Make library compatible with standard-schema rather than only zod
[] Implement json schema validation with @hyperjump/json-schema

## 💻 Development

- Clone this repository
- Install dependencies using `bun install`
- Run interactive tests using `bun dev`
- Use `bun test` before push to ensure all tests and lint checks passing

## License

[MIT](./LICENSE)

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/sveltekit-auto-openapi?style=flat-square
[npm-version-href]: https://npmjs.com/package/sveltekit-auto-openapi
[npm-downloads-src]: https://img.shields.io/npm/dm/sveltekit-auto-openapi?style=flat-square
[npm-downloads-href]: https://npmjs.com/package/sveltekit-auto-openapi
[github-actions-src]: https://img.shields.io/github/actions/workflow/status/unjs/sveltekit-auto-openapi/ci.yml?branch-main&style=flat-square
[github-actions-href]: https://github.com/unjs/sveltekit-auto-openapi/actions?query=workflow%3Aci
[codecov-src]: https://img.shields.io/codecov/c/gh/unjs/sveltekit-auto-openapi/main?style=flat-square
[codecov-href]: https://codecov.io/gh/unjs/sveltekit-auto-openapi
[bundle-src]: https://img.shields.io/bundlephobia/minzip/sveltekit-auto-openapi?style=flat-square
[bundle-href]: https://bundlephobia.com/result?p=sveltekit-auto-openapi
