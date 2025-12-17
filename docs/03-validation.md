---
title: Validation & Schemas
description: Runtime validation using JSON Schema with Zod support
---

# Validation & Schemas

The most powerful feature of this library is the `_config` export with validation schemas. It allows you to define strict schemas for every part of the HTTP request and response, with validation powered by JSON Schema.

## The `_config` Object

You can export `_config` from any `+server.ts` file with validation using the consolidated `openapiOverride` approach:

```ts
import { z } from "zod";
import type { RouteConfig } from "sveltekit-auto-openapi/scalar-module";

export const _config: RouteConfig = {
  openapiOverride: {
    POST: {
      summary: "Create user",
      description: "Creates a new user account",
      tags: ["Users"],

      // Validate headers with custom $ property
      $headers: {
        $showErrorMessage: true,
        $skipValidation: false,
        schema: z.object({
          "x-api-key": z.string().min(10),
        }),
      },

      // Validate query parameters with custom $ property
      $query: {
        $showErrorMessage: true,
        schema: z.object({
          notify: z.enum(["true", "false"]).optional(),
        }),
      },

      // Validate path parameters with custom $ property
      $pathParams: {
        $showErrorMessage: true,
        schema: z.object({
          id: z.string().uuid(),
        }),
      },

      // Validate cookies with custom $ property
      $cookies: {
        $showErrorMessage: false, // Hide cookie validation errors in production
        schema: z.object({
          session_id: z.string(),
        }),
      },

      // Validate request body (standard OpenAPI structure)
      requestBody: {
        description: "User data",
        content: {
          "application/json": {
            $showErrorMessage: true,
            $skipValidation: false,
            schema: z.object({
              username: z.string().min(3).max(20),
              email: z.string().email(),
              role: z.enum(["admin", "user"]).default("user"),
            }),
          },
        },
      },

      // Validate responses (standard OpenAPI structure)
      responses: {
        "201": {
          description: "User created successfully",
          content: {
            "application/json": {
              $showErrorMessage: true,
              schema: z.object({
                success: z.boolean(),
                userId: z.string().uuid(),
              }),
            },
          },
        },
        "400": {
          description: "Validation error",
          content: {
            "application/json": {
              schema: z.object({
                error: z.string(),
                issues: z.array(z.object({
                  path: z.string(),
                  message: z.string(),
                })).optional(),
              }),
            },
          },
        },
      },
    },
  },
};
```

## Validation Properties

### Custom Operation-Level Properties

Use `$` prefixed properties at the operation level to validate request components:

- **`$headers`** - Validate HTTP headers
- **`$query`** - Validate query string parameters
- **`$pathParams`** - Validate URL path parameters
- **`$cookies`** - Validate cookies

### Standard OpenAPI Properties with Validation

Use standard OpenAPI structure with validation flags:

- **`requestBody.content['application/json']`** - Validate request body
- **`responses[statusCode].content['application/json']`** - Validate response body
- **`responses[statusCode].headers[headerName]`** - Validate response headers

## Validation Flags

Each validation schema supports optional flags:

### `$showErrorMessage`

Controls whether detailed validation errors are shown to the client:

- **Default**: `true` in development, `false` in production
- **Use case**: Set to `false` for sensitive data (like authentication headers) to prevent information leakage

```ts
$headers: {
  $showErrorMessage: false, // Hide header validation details
  schema: z.object({ "x-api-key": z.string() }),
}
```

### `$skipValidation`

Completely skips validation for this schema:

- **Default**: `false`
- **Use case**: Useful for documenting schemas without enforcing validation, or during development

```ts
requestBody: {
  content: {
    "application/json": {
      $skipValidation: true, // Document but don't validate
      schema: z.object({ email: z.string() }),
    },
  },
}
```

## Schema Formats

You can use either **Zod schemas** or **raw JSON Schema** objects:

### Using Zod (Recommended)

Zod provides excellent TypeScript integration and developer experience:

```ts
import { z } from "zod";

export const _config = {
  openapiOverride: {
    POST: {
      requestBody: {
        content: {
          "application/json": {
            schema: z.object({
              email: z.string().email(),
              age: z.number().int().min(18).max(120),
              role: z.enum(["admin", "user"]),
            }),
          },
        },
      },
    },
  },
};
```

### Using Raw JSON Schema

For projects without Zod, use standard JSON Schema:

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
                email: { type: "string", format: "email" },
                age: { type: "integer", minimum: 18, maximum: 120 },
                role: { type: "string", enum: ["admin", "user"] },
              },
              required: ["email", "age", "role"],
            },
          },
        },
      },
    },
  },
};
```

## How Validation Works

### Request Phase

1. **Hook Interception**: The `createSchemaValidationHook` intercepts incoming requests
2. **Schema Lookup**: Looks up validation config for the route/method combination
3. **Sequential Validation**: Validates in order:
   - Headers (`$headers`)
   - Query parameters (`$query`)
   - Path parameters (`$pathParams`)
   - Cookies (`$cookies`)
   - Request body (`requestBody`)
4. **Error Response**: If any validation fails, returns `400 Bad Request` with formatted errors
5. **Handler Execution**: Only calls your handler if all validations pass

### Response Phase (Optional)

Enable response validation in development to catch bugs:

```ts
// src/hooks.server.ts
import { createSchemaValidationHook } from "sveltekit-auto-openapi/schema-validation-hook";

export const handle = createSchemaValidationHook({
  validateOutput: import.meta.env.DEV, // Only in development
});
```

Response validation:

1. Matches response status code against defined schemas
2. Validates response body and headers
3. Logs errors to console (doesn't block the response)
4. Returns `500 Internal Server Error` if validation fails

## Validation Error Format

Validation errors follow a consistent format:

```json
{
  "error": "Request body validation failed",
  "issues": [
    {
      "path": "email",
      "message": "Invalid email format",
      "keyword": "format"
    },
    {
      "path": "age",
      "message": "Must be greater than or equal to 18",
      "keyword": "minimum"
    }
  ]
}
```

In production (or when `$showErrorMessage: false`), only a generic error is shown:

```json
{
  "error": "Invalid request data"
}
```

## Complete Example

Here's a comprehensive example showing all validation features:

```ts
// src/routes/api/users/[id]/+server.ts
import { json } from "@sveltejs/kit";
import { z } from "zod";
import type { RouteConfig } from "sveltekit-auto-openapi/scalar-module";

export const _config: RouteConfig = {
  openapiOverride: {
    PUT: {
      summary: "Update user",
      description: "Updates an existing user's information",
      tags: ["Users"],

      // Validate authentication header
      $headers: {
        $showErrorMessage: false, // Don't leak auth details
        schema: z.object({
          authorization: z.string().startsWith("Bearer "),
        }),
      },

      // Validate path parameter
      $pathParams: {
        schema: z.object({
          id: z.string().uuid(),
        }),
      },

      // Validate optional query flag
      $query: {
        schema: z.object({
          notify: z.enum(["true", "false"]).default("false"),
        }),
      },

      // Validate request body
      requestBody: {
        content: {
          "application/json": {
            $showErrorMessage: true,
            schema: z.object({
              name: z.string().min(1).max(100).optional(),
              email: z.string().email().optional(),
              age: z.number().int().min(18).max(120).optional(),
            }).refine(
              (data) => Object.keys(data).length > 0,
              { message: "At least one field must be provided" }
            ),
          },
        },
      },

      // Validate responses
      responses: {
        "200": {
          description: "User updated successfully",
          content: {
            "application/json": {
              schema: z.object({
                success: z.boolean(),
                user: z.object({
                  id: z.string().uuid(),
                  name: z.string(),
                  email: z.string().email(),
                  updatedAt: z.string().datetime(),
                }),
              }),
            },
          },
        },
        "400": {
          description: "Validation error",
          content: {
            "application/json": {
              schema: z.object({
                error: z.string(),
                issues: z.array(z.any()).optional(),
              }),
            },
          },
        },
        "401": {
          description: "Unauthorized",
          content: {
            "application/json": {
              schema: z.object({
                error: z.literal("Unauthorized"),
              }),
            },
          },
        },
        "404": {
          description: "User not found",
          content: {
            "application/json": {
              schema: z.object({
                error: z.literal("User not found"),
              }),
            },
          },
        },
      },
    },
  },
};

export async function PUT({ request, params }) {
  // All validation has passed at this point!
  const userId = params.id; // Validated as UUID
  const updates = await request.json(); // Validated schema

  // Your business logic here
  const user = await updateUser(userId, updates);

  return json({
    success: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      updatedAt: new Date().toISOString(),
    },
  });
}
```

## Best Practices

### 1. Use Validation Flags Wisely

- Set `$showErrorMessage: false` for sensitive data (auth headers, API keys)
- Use `$skipValidation: true` during development to document without enforcing

### 2. Enable Response Validation in Development

Catch bugs early by validating responses in dev mode:

```ts
createSchemaValidationHook({
  validateOutput: import.meta.env.DEV,
});
```

### 3. Provide Meaningful Descriptions

Help API consumers understand your endpoints:

```ts
openapiOverride: {
  POST: {
    summary: "Create user account",
    description: "Creates a new user with email verification",
    requestBody: {
      description: "User registration data",
      // ...
    },
  },
}
```

### 4. Validate All Inputs

Always validate:

- **Headers**: For authentication tokens, API keys
- **Path Params**: Ensure correct formats (UUIDs, slugs)
- **Query Params**: Validate pagination, filters
- **Request Body**: Enforce data contracts

### 5. Document Error Responses

Define all possible error responses:

```ts
responses: {
  "400": { description: "Validation error", /* ... */ },
  "401": { description: "Unauthorized", /* ... */ },
  "404": { description: "Not found", /* ... */ },
  "500": { description: "Internal error", /* ... */ },
}
```

## Troubleshooting

### Validation Not Working

1. **Check hook setup**: Ensure `createSchemaValidationHook` is in your `hooks.server.ts`
2. **Verify route path**: The validation maps to the OpenAPI path format (`/users/{id}`)
3. **Enable debug mode**: Set `DEBUG_OPENAPI=true` to see what's being generated

### Zod Schemas Not Converting

1. **Install zod**: Ensure `zod` is installed as a peer dependency
2. **Check schema format**: Zod schemas must have `_def` and `parse` properties
3. **Use supported Zod types**: Complex custom schemas may not convert perfectly

### Performance Concerns

JSON Schema validation is fast, but if you need more performance:

1. **Use `$skipValidation`**: Skip validation for non-critical endpoints
2. **Validate selectively**: Don't validate every header, just what you need
3. **Production optimization**: Disable response validation in production
