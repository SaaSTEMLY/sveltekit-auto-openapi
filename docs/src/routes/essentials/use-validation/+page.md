---
title: useValidation Request Handler
description: Optimized per-route validation with full type safety
---

# useValidation Request Handler

`useValidation` is an optimized request handler wrapper that provides per-route validation with full type safety. Unlike the global validation hook, it only loads validation schemas for the specific route being executed.

## Why useValidation?

### Performance Benefits

The global validation hook (`createSchemaValidationHook`) loads **all** validation schemas into memory at startup. This can impact performance in applications with many routes:

```ts
// ❌ Global Hook - Loads ALL validations into memory
import { createSchemaValidationHook } from "sveltekit-auto-openapi/schema-validation-hook";

export const handle = createSchemaValidationHook({
  validateOutput: true,
});
// Memory: ~5MB for 100 routes with validation
```

`useValidation` only loads schemas when the route is actually called:

```ts
// ✅ useValidation - Only loads schemas for THIS route
import { useValidation } from "sveltekit-auto-openapi/request-handler";

export const POST = useValidation(
  "POST",
  _config,
  async ({ validated, json, error }) => {
    // Memory: ~50KB for this single route
  }
);
```

### Additional Benefits

- **Type Safety** - Full TypeScript inference for validated inputs and responses
- **Cleaner Code** - Validation logic co-located with route handlers
- **Better DX** - Access validated data via `event.validated` instead of re-parsing
- **Flexible** - Mix and match with routes that don't need validation

## Basic Usage

```ts
// src/routes/api/users/+server.ts
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
            schema: z
              .object({
                email: z.string().email(),
                name: z.string(),
              })
              .toJSONSchema(),
          },
        },
      },
      responses: {
        "200": {
          description: "User created",
          content: {
            "application/json": {
              schema: z
                .object({
                  id: z.string(),
                  email: z.string(),
                })
                .toJSONSchema(),
            },
          },
        },
      },
    },
  },
} satisfies RouteConfig;

export const POST = useValidation(
  "POST",
  _config,
  async ({ validated, json, error }) => {
    // validated.body is fully typed and validated!
    const { email, name } = validated.body;

    // Your business logic here
    const userId = crypto.randomUUID();

    return json({ id: userId, email });
  }
);
```

## Type Safety

`useValidation` provides full TypeScript inference for:

### Validated Inputs

```ts
export const POST = useValidation("POST", _config, async ({ validated }) => {
  // All validated properties are fully typed:
  validated.body; // Type: { email: string; name: string }
  validated.query; // Type: Record<string, string> or validated schema type
  validated.pathParams; // Type: Record<string, string> or validated schema type
  validated.headers; // Type: Record<string, string> or validated schema type
  validated.cookies; // Type: Record<string, string> or validated schema type
});
```

### Response Types

The `json` and `error` helpers are also type-safe:

```ts
export const POST = useValidation(
  "POST",
  _config,
  async ({ validated, json, error }) => {
    // ✅ Correct - matches response schema
    return json({ id: "123", email: "user@example.com" });

    // ❌ Type error - missing required field
    return json({ id: "123" });

    // ✅ Typed error responses
    return error(400, { error: "Invalid input" });
  }
);
```

## Validation Configuration

### Request Validation

Validate different parts of the incoming request:

```ts
export const _config = {
  openapiOverride: {
    POST: {
      // Validate headers
      $headers: {
        $showErrorMessage: true,
        schema: z
          .object({
            "x-api-key": z.string(),
            "content-type": z.literal("application/json"),
          })
          .toJSONSchema(),
      },

      // Validate query parameters
      $query: {
        schema: z
          .object({
            page: z.string().regex(/^\d+$/),
            limit: z.string().regex(/^\d+$/),
          })
          .toJSONSchema(),
      },

      // Validate path parameters
      $pathParams: {
        schema: z
          .object({
            id: z.string().uuid(),
          })
          .toJSONSchema(),
      },

      // Validate cookies
      $cookies: {
        schema: z
          .object({
            sessionId: z.string(),
          })
          .toJSONSchema(),
      },

      // Validate request body
      requestBody: {
        content: {
          "application/json": {
            schema: z
              .object({
                email: z.string().email(),
              })
              .toJSONSchema(),
          },
        },
      },
    },
  },
} satisfies RouteConfig;

export const POST = useValidation(
  "POST",
  _config,
  async ({ validated, json, error }) => {
    const { headers, query, pathParams, cookies, body } = validated;

    // All properties are validated and typed!
    console.log(headers["x-api-key"]);
    console.log(query.page, query.limit);
    console.log(pathParams.id);
    console.log(cookies.sessionId);
    console.log(body.email);

    return json({ success: true });
  }
);
```

### Response Validation

Validate outgoing responses (recommended for development):

```ts
export const _config = {
  openapiOverride: {
    POST: {
      responses: {
        // Success response
        "200": {
          description: "Success",
          content: {
            "application/json": {
              $showErrorMessage: import.meta.env.DEV, // Show errors in dev only
              schema: z
                .object({
                  id: z.string(),
                  email: z.string().email(),
                })
                .toJSONSchema(),
            },
          },
        },

        // Error response
        "400": {
          description: "Bad request",
          content: {
            "application/json": {
              schema: z
                .object({
                  error: z.string(),
                })
                .toJSONSchema(),
            },
          },
        },
      },
    },
  },
} satisfies RouteConfig;
```

## Validation Flags

### `$showErrorMessage`

Controls whether detailed validation errors are shown:

```ts
requestBody: {
  content: {
    "application/json": {
      $showErrorMessage: import.meta.env.DEV, // Detailed errors in dev only
      schema: z.object({ email: z.string().email() }).toJSONSchema(),
    },
  },
}
```

**Development:**

```json
{
  "error": "Request body validation failed",
  "issues": [
    {
      "path": "email",
      "message": "must be a valid email",
      "keyword": "format"
    }
  ]
}
```

**Production:**

```json
{
  "error": "Invalid request data"
}
```

### `$skipValidation`

Skip validation for specific schemas:

```ts
$headers: {
  $skipValidation: true, // Skip header validation
  schema: z.object({ "x-api-key": z.string() }).toJSONSchema(),
}
```

## Error Handling

`useValidation` automatically handles validation errors:

### Input Validation Errors (400)

When request validation fails:

```ts
// Request: POST /api/users with { "email": "invalid" }

// Response: 400 Bad Request
{
  "error": "Request body validation failed",
  "issues": [
    {
      "path": "email",
      "message": "must be a valid email",
      "keyword": "format"
    }
  ]
}
```

### Output Validation Errors (500)

When response validation fails (only in development if configured):

```ts
export const POST = useValidation("POST", _config, async () => {
  // ❌ This will fail response validation
  return json({ wrongField: "value" });
});

// Response: 500 Internal Server Error
{
  "error": "Response body validation failed",
  "issues": [...]
}
```

### Manual Error Responses

Use the typed `error` helper for custom errors:

```ts
export const POST = useValidation(
  "POST",
  _config,
  async ({ validated, json, error }) => {
    if (!validated.body.email.endsWith("@company.com")) {
      // Typed error response
      return error(400, { error: "Only company emails allowed" });
    }

    return json({ success: true });
  }
);
```

## Multiple HTTP Methods

Handle multiple methods in one file:

```ts
export const _config = {
  openapiOverride: {
    GET: {
      summary: "Get user",
      responses: {
        "200": {
          content: {
            "application/json": {
              schema: z
                .object({ id: z.string(), email: z.string() })
                .toJSONSchema(),
            },
          },
        },
      },
    },
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
        "201": {
          content: {
            "application/json": {
              schema: z.object({ id: z.string() }).toJSONSchema(),
            },
          },
        },
      },
    },
  },
} satisfies RouteConfig;

export const GET = useValidation(
  "GET",
  _config,
  async ({ params, json, error }) => {
    return json({ id: params.id, email: "user@example.com" });
  }
);

export const POST = useValidation(
  "POST",
  _config,
  async ({ validated, json, error }) => {
    const { email } = validated.body;
    return json({ id: crypto.randomUUID() }, { status: 201 });
  }
);
```

## Performance Comparison

| Approach      | Memory Usage      | Startup Time | Request Overhead |
| ------------- | ----------------- | ------------ | ---------------- |
| Global Hook   | ~5MB (100 routes) | +200ms       | ~1-2ms           |
| useValidation | ~50KB per route   | No impact    | ~1-2ms           |

**Recommendation:**

- **Small apps (<20 routes)**: Either approach works well
- **Medium apps (20-100 routes)**: Consider `useValidation` for better memory usage
- **Large apps (100+ routes)**: Strongly recommend `useValidation` for optimal performance

## Migration from Global Hook

Migrating from the global validation hook is straightforward:

### Before (Global Hook)

```ts
// hooks.server.ts
export const handle = createSchemaValidationHook({ validateOutput: true });

// +server.ts
export const _config = {
  /* ... */
};
export async function POST({ request }) {
  const body = await request.json();
  return json({ success: true });
}
```

### After (useValidation)

```ts
// hooks.server.ts
// Remove or comment out the validation hook

// +server.ts
import { useValidation } from "sveltekit-auto-openapi/request-handler";

export const _config = {
  /* ... */
};
export const POST = useValidation(
  "POST",
  _config,
  async ({ validated, json, error }) => {
    const body = validated.body;
    return json({ success: true });
  }
);
```

## When to Use Global Hook vs useValidation

### Use Global Hook When:

- Small application (<20 routes)
- Prefer centralized validation setup
- Don't mind the memory overhead
- Want automatic validation without touching route files

### Use useValidation When:

- Medium to large application (20+ routes)
- Want optimized memory usage
- Prefer type-safe validated inputs
- Want validation logic co-located with handlers
- Only some routes need validation

## Next Steps

- Explore [Validation Flags](/advanced/validation-flags/) for detailed control
- Learn about [Type Safety](/advanced/type-safety/) with validated inputs
- Compare with [Schema Validation Hook](/essentials/schema-validation-hook/) approach
- See [Advanced RouteConfig](/essentials/usage-in-server-routes/advanced-route-config/) for more config options
