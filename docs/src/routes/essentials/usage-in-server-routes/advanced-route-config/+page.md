---
title: Advanced (_config RouteConfig)
description: Add runtime validation and detailed documentation with RouteConfig
---

# Advanced (_config RouteConfig)

For production APIs, you'll want runtime validation and detailed documentation. Export a `_config` object with your validation schemas and OpenAPI metadata.

## Basic Example with Zod

```ts
import type { RouteConfig } from "sveltekit-auto-openapi/scalar-module";
import { json } from "@sveltejs/kit";
import z from "zod";

export const _config = {
  openapiOverride: {
    POST: {
      summary: "Create user",
      description: "Creates a new user with email",
      requestBody: {
        content: {
          "application/json": {
            schema: z.object({
              email: z.string().email(),
            }).toJSONSchema(),
          },
        },
      },
      responses: {
        "200": {
          description: "Success",
          content: {
            "application/json": {
              schema: z.object({
                success: z.boolean(),
              }).toJSONSchema(),
            },
          },
        },
      },
    },
  },
} satisfies RouteConfig;

export async function POST({ request }) {
  // Request is already validated by the hook!
  const { email } = await request.json();
  return json({ success: true });
}
```

## Validation Properties

You can validate multiple parts of the request:

### Request Body

```ts
requestBody: {
  content: {
    "application/json": {
      schema: z.object({ email: z.string().email() }).toJSONSchema(),
    },
  },
}
```

### Headers

```ts
$headers: {
  schema: z.object({
    "x-api-key": z.string(),
  }).toJSONSchema(),
}
```

### Query Parameters

```ts
$query: {
  schema: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
  }).toJSONSchema(),
}
```

### Path Parameters

```ts
$pathParams: {
  schema: z.object({
    id: z.string().uuid(),
  }).toJSONSchema(),
}
```

### Cookies

```ts
$cookies: {
  schema: z.object({
    sessionId: z.string(),
  }).toJSONSchema(),
}
```

## Complete Example

```ts
import type { RouteConfig } from "sveltekit-auto-openapi/scalar-module";
import { json } from "@sveltejs/kit";
import z from "zod";

export const _config = {
  openapiOverride: {
    POST: {
      summary: "Create user",
      description: "Creates a new user with email",

      // Validate headers
      $headers: {
        $showErrorMessage: true,
        $skipValidation: false,
        schema: z.object({
          "x-api-key": z.string(),
        }).toJSONSchema(),
      },

      // Validate query parameters
      $query: {
        schema: z.object({
          notify: z.enum(["true", "false"]).optional(),
        }).toJSONSchema(),
      },

      // Validate request body
      requestBody: {
        content: {
          "application/json": {
            $showErrorMessage: true,
            schema: z.object({
              email: z.string().email(),
              name: z.string().min(2),
            }).toJSONSchema(),
          },
        },
      },

      // Validate responses
      responses: {
        "200": {
          description: "Success",
          content: {
            "application/json": {
              schema: z.object({
                id: z.string().uuid(),
                email: z.string().email(),
                name: z.string(),
              }).toJSONSchema(),
            },
          },
        },
        "400": {
          description: "Invalid input",
        },
      },
    },
  },
} satisfies RouteConfig;

export async function POST({ request }) {
  const { email, name } = await request.json();
  // Validation already passed, safe to use
  return json({
    id: crypto.randomUUID(),
    email,
    name,
  });
}
```

## Validation Flags

Control validation behavior with flags:

### `$showErrorMessage`

Show detailed validation errors:

```ts
requestBody: {
  content: {
    "application/json": {
      $showErrorMessage: true, // Show detailed errors
      schema: z.object({ ... }).toJSONSchema(),
    },
  },
}
```

**Recommended:**
- `true` in development
- `false` in production (for security)

### `$skipValidation`

Skip validation for specific schemas:

```ts
$headers: {
  $skipValidation: true, // Don't validate, just document
  schema: z.object({ ... }).toJSONSchema(),
}
```

## Using Raw JSON Schema

Don't want to use Zod? Use raw JSON Schema:

```ts
export const _config = {
  openapiOverride: {
    POST: {
      requestBody: {
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                email: {
                  type: "string",
                  format: "email",
                },
              },
              required: ["email"],
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
                  success: { type: "boolean" },
                },
                required: ["success"],
              },
            },
          },
        },
      },
    },
  },
} satisfies RouteConfig;
```

## Multiple HTTP Methods

Configure multiple methods in one file:

```ts
export const _config = {
  openapiOverride: {
    GET: {
      summary: "Get user",
      responses: { /* ... */ },
    },
    POST: {
      summary: "Create user",
      requestBody: { /* ... */ },
      responses: { /* ... */ },
    },
    PUT: {
      summary: "Update user",
      requestBody: { /* ... */ },
      responses: { /* ... */ },
    },
    DELETE: {
      summary: "Delete user",
      responses: { /* ... */ },
    },
  },
} satisfies RouteConfig;
```

## Response Status Codes

Define multiple response status codes:

```ts
responses: {
  "200": {
    description: "Success",
    content: { /* ... */ },
  },
  "201": {
    description: "Created",
    content: { /* ... */ },
  },
  "400": {
    description: "Bad request",
  },
  "401": {
    description: "Unauthorized",
  },
  "404": {
    description: "Not found",
  },
  "500": {
    description: "Server error",
  },
}
```

## StandardSchema Support

SvelteKit Auto OpenAPI supports multiple schema libraries:

### Zod

```ts
import z from "zod";
schema: z.object({ ... }).toJSONSchema()
```

### Valibot

```ts
import * as v from "valibot";
schema: v.object({ ... }).toJSONSchema()
```

### TypeBox

```ts
import { Type } from "@sinclair/typebox";
schema: Type.Object({ ... })
```

### ArkType

```ts
import { type } from "arktype";
schema: type({ ... }).toJSONSchema()
```

## Next Steps

- Learn about [Validation Flags](/advanced/validation-flags/) for detailed control
- Explore [Type Safety](/advanced/type-safety/) for type extraction
- See [Virtual Modules](/advanced/virtual-modules/) for advanced usage
- Check [Troubleshooting](/advanced/troubleshooting/) if you encounter issues
