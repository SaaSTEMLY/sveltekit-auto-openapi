---
title: Error Handling
description: Patterns for handling errors in validated routes
---

# Error Handling

This guide covers error handling patterns when using SvelteKit Auto OpenAPI, including validation errors, custom errors, and typed error responses.

## Error Response Patterns

### Using the error() Helper

When you export a `_config`, the plugin injects a typed `error()` helper:

```typescript
import type { RouteConfig } from "sveltekit-auto-openapi/types";

export const _config = {
  openapiOverride: {
    POST: {
      responses: {
        "400": {
          description: "Bad request",
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
        "404": {
          description: "Not found",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  error: { type: "string" },
                  code: { type: "string" },
                },
              },
            },
          },
        },
      },
    },
  },
} satisfies RouteConfig;

export async function POST({ validated, json, error }) {
  const { userId } = validated.body;

  const user = await findUser(userId);

  if (!user) {
    // Type-checked against 404 schema
    error(404, { error: "User not found", code: "USER_NOT_FOUND" });
  }

  return json({ success: true });
}
```

**Benefits:**

- Type-safe error payloads
- Enforces schema compliance
- IDE autocomplete for error shapes

### Standard SvelteKit Error

You can also use SvelteKit's standard `error()` without type checking:

```typescript
import { error } from "@sveltejs/kit";

export async function POST({ request }) {
  const data = await request.json();

  if (!data.email) {
    error(400, "Email is required");
  }

  // ...
}
```

This works but doesn't enforce your OpenAPI schema.

## Validation Errors

### Default Validation Errors

When request validation fails, the plugin returns a 400 error:

```ts
{
  "error": "Validation failed"
}
```

This is the default behavior to avoid exposing schema details.

### Detailed Validation Errors

Enable detailed errors for debugging:

```typescript
requestBody: {
  content: {
    'application/json': {
      $_returnDetailedError: true,
      schema: {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email' },
          age: { type: 'number', minimum: 18 }
        },
        required: ['email', 'age']
      }
    }
  }
}
```

**Detailed error response:**

```ts
{
  "error": "Validation failed",
  "details": [
    {
      "instancePath": "/email",
      "keyword": "format",
      "message": "must match format \"email\"",
      "params": { "format": "email" }
    },
    {
      "instancePath": "/age",
      "keyword": "minimum",
      "message": "must be >= 18",
      "params": { "comparison": ">=", "limit": 18 }
    }
  ]
}
```

**When to use detailed errors:**

- Development and testing
- Public APIs with external developers
- Internal tools where debugging is important

**When to use simple errors:**

- Production APIs (security)
- Customer-facing endpoints
- When you don't want to expose schema structure

### Environment-Based Error Detail

Switch based on environment:

```typescript
const isDev = import.meta.env.DEV;

requestBody: {
  content: {
    'application/json': {
      $_returnDetailedError: isDev,  // Detailed in dev only
      schema: { /* ... */ }
    }
  }
}
```

Or use plugin defaults:

```typescript
// vite.config.ts
const isDev = process.env.NODE_ENV === "development";

svelteOpenApi({
  returnsDetailedErrorDefault: {
    request: isDev, // Detailed request errors in dev
    response: false, // Never detailed response errors
  },
});
```

## Custom Error Schemas

Define custom error response shapes:

### Simple Error Schema

```typescript
const ErrorSchema = {
  type: "object",
  properties: {
    error: { type: "string" },
  },
  required: ["error"],
} as const;

export const _config = {
  openapiOverride: {
    POST: {
      responses: {
        "400": {
          description: "Bad request",
          content: { "application/json": { schema: ErrorSchema } },
        },
        "404": {
          description: "Not found",
          content: { "application/json": { schema: ErrorSchema } },
        },
      },
    },
  },
} satisfies RouteConfig;
```

### Detailed Error Schema

```typescript
const DetailedErrorSchema = {
  type: "object",
  properties: {
    error: { type: "string" },
    code: { type: "string" },
    timestamp: { type: "string", format: "date-time" },
    requestId: { type: "string" },
  },
  required: ["error", "code"],
} as const;

export async function POST({ validated, json, error, request }) {
  const requestId = request.headers.get("x-request-id") || crypto.randomUUID();

  try {
    // Process request...
  } catch (err) {
    error(500, {
      error: err.message,
      code: "INTERNAL_ERROR",
      timestamp: new Date().toISOString(),
      requestId,
    });
  }
}
```

### Field-Level Error Schema

Return errors with field-specific details:

```typescript
const ValidationErrorSchema = {
  type: "object",
  properties: {
    error: { type: "string" },
    fields: {
      type: "array",
      items: {
        type: "object",
        properties: {
          field: { type: "string" },
          message: { type: "string" },
          value: { type: "string" },
        },
      },
    },
  },
} as const;

export async function POST({ validated, error }) {
  const errors: Array<{ field: string; message: string; value: any }> = [];

  if (validated.body.email && !isValidEmail(validated.body.email)) {
    errors.push({
      field: "email",
      message: "Invalid email format",
      value: validated.body.email,
    });
  }

  if (errors.length > 0) {
    error(400, {
      error: "Validation failed",
      fields: errors,
    });
  }

  // ...
}
```

## Error Handling Patterns

### Centralized Error Handling

Create reusable error handlers:

```typescript
// src/lib/errors.ts
export const Errors = {
  NotFound: (resource: string, id: string) => ({
    status: 404,
    body: {
      error: `${resource} not found`,
      code: "NOT_FOUND",
      details: { resource, id },
    },
  }),

  Unauthorized: (reason?: string) => ({
    status: 401,
    body: {
      error: "Unauthorized",
      code: "UNAUTHORIZED",
      details: { reason },
    },
  }),

  ValidationFailed: (fields: string[]) => ({
    status: 400,
    body: {
      error: "Validation failed",
      code: "VALIDATION_ERROR",
      details: { fields },
    },
  }),

  Internal: (message: string) => ({
    status: 500,
    body: {
      error: "Internal server error",
      code: "INTERNAL_ERROR",
      details: { message },
    },
  }),
};
```

Use in routes:

```typescript
import { Errors } from "$lib/errors";

export async function GET({ params, error }) {
  const user = await findUser(params.id);

  if (!user) {
    const err = Errors.NotFound("User", params.id);
    error(err.status, err.body);
  }

  return json(user);
}
```

### Try-Catch with Typed Errors

Handle errors with proper typing:

```typescript
export async function POST({ validated, json, error }) {
  try {
    const result = await createResource(validated.body);
    return json(result);
  } catch (err) {
    if (err instanceof ValidationError) {
      error(400, {
        error: "Validation failed",
        code: "VALIDATION_ERROR",
        details: err.details,
      });
    }

    if (err instanceof NotFoundError) {
      error(404, {
        error: err.message,
        code: "NOT_FOUND",
      });
    }

    // Fallback to 500
    error(500, {
      error: "Internal server error",
      code: "INTERNAL_ERROR",
    });
  }
}
```

### Guard Clauses

Use early returns for cleaner code:

```typescript
export async function POST({ validated, json, error }) {
  const { email, password } = validated.body;

  // Validate email
  if (!isValidEmail(email)) {
    error(400, { error: "Invalid email format" });
  }

  // Check user exists
  const user = await findUserByEmail(email);
  if (!user) {
    error(404, { error: "User not found" });
  }

  // Verify password
  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    error(401, { error: "Invalid credentials" });
  }

  // All checks passed
  return json({ token: generateToken(user) });
}
```

### Error Recovery

Handle errors gracefully:

```typescript
export async function POST({ validated, json, error }) {
  try {
    const result = await primaryService.create(validated.body);
    return json(result);
  } catch (err) {
    // Log error
    console.error("Primary service failed:", err);

    // Try fallback
    try {
      const result = await fallbackService.create(validated.body);
      return json(result);
    } catch (fallbackErr) {
      // Both failed
      error(500, {
        error: "Service unavailable",
        code: "SERVICE_ERROR",
      });
    }
  }
}
```

## Response Validation Errors

### Handling Response Validation Failures

When response validation fails, the plugin returns a 500 error. This indicates your handler returned data that doesn't match the schema:

```typescript
responses: {
  '200': {
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' }
          },
          required: ['id', 'email']
        }
      }
    }
  }
}

export async function GET({ json }) {
  // This will fail response validation - missing 'email'
  return json({ id: '123' });
  // Plugin returns 500: "Response validation failed"
}
```

**How to fix:**

1. Ensure your handler returns data matching the schema
2. Add missing fields
3. Or update the schema to match actual responses

### Skipping Response Validation

In production, you might skip response validation for performance:

```typescript
responses: {
  '200': {
    content: {
      'application/json': {
        $_skipValidation: true,  // Skip in production
        schema: { /* ... */ }
      }
    }
  }
}
```

Or set globally:

```typescript
// vite.config.ts
svelteOpenApi({
  skipValidationDefault: {
    response: true, // Skip all response validation
  },
});
```

## Best Practices

### 1. Define All Error Responses

Document all possible error states:

```typescript
responses: {
  '200': { /* success */ },
  '400': { /* validation error */ },
  '401': { /* unauthorized */ },
  '403': { /* forbidden */ },
  '404': { /* not found */ },
  '500': { /* server error */ }
}
```

### 2. Use Consistent Error Shapes

Standardize error responses across your API:

```typescript
// All errors follow this shape
interface ApiError {
  error: string;
  code: string;
  timestamp?: string;
  requestId?: string;
  details?: unknown;
}
```

### 3. Don't Expose Internal Details

In production, avoid leaking implementation details:

```typescript
// ❌ Bad - exposes internals
error(500, { error: err.stack });

// ✅ Good - generic message
error(500, { error: "Internal server error", code: "INTERNAL_ERROR" });

// ✅ Better - log internally, return generic
console.error("Database error:", err);
error(500, { error: "Service temporarily unavailable" });
```

### 4. Use Error Codes

Provide machine-readable error codes:

```typescript
error(400, {
  error: "Email already exists",
  code: "EMAIL_DUPLICATE",
});
```

Clients can handle specific errors:

```typescript
try {
  await fetch("/api/users", { method: "POST", body: data });
} catch (err) {
  if (err.code === "EMAIL_DUPLICATE") {
    // Show specific message
  }
}
```

### 5. Log Errors

Always log errors for debugging:

```typescript
export async function POST({ validated, error }) {
  try {
    // ...
  } catch (err) {
    // Log with context
    console.error("Failed to create user:", {
      error: err,
      userId: validated.body.id,
      timestamp: new Date().toISOString(),
    });

    error(500, { error: "Internal server error" });
  }
}
```

### 6. Test Error Cases

Write tests for error scenarios:

```typescript
import { describe, test, expect } from "bun:test";

describe("User API errors", () => {
  test("returns 404 for non-existent user", async () => {
    const response = await GET({ params: { id: "999" } });
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe("User not found");
  });

  test("returns 400 for invalid email", async () => {
    const response = await POST({
      validated: { body: { email: "invalid" } },
    });
    expect(response.status).toBe(400);
  });
});
```

## Related Documentation

- [Validation Guide](/guides/validation/) - Configuring validation schemas
- [Route Configuration](/fundamentals/route-config/) - Defining error responses
- [Best Practices](/guides/best-practices/) - General API best practices
