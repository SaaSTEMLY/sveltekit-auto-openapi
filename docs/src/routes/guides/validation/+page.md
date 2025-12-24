---
title: Validation Guide
description: Using runtime validation with StandardSchema and JSON Schema
---

# Validation Guide

This guide covers everything you need to know about runtime validation in SvelteKit Auto OpenAPI.

## Understanding Validation

### What Gets Validated

When you add a `_config` export to your route, the plugin can validate:

**Request:**

- Headers
- Cookies
- Query parameters
- Path parameters
- Request body (JSON)

**Response:**

- Response body (JSON)
- Response headers (optional)
- Response cookies (optional)

### When Validation Happens

Validation occurs at runtime in this order:

```
1. Request arrives
2. Validation wrapper intercepts
3. Validates headers, cookies, query, path params, body
4. If validation fails → return 400 error
5. If validation passes → inject validated data
6. Run your handler function
7. Handler returns response
8. Validate response body (if configured)
9. If response validation fails → return 500 error
10. Return response to client
```

## Using StandardSchema

[StandardSchema](https://standardschema.dev) is a unified interface for schema validation libraries. SvelteKit Auto OpenAPI supports any library that implements StandardSchema.

### Zod

The most popular TypeScript schema library:

```typescript
import { z } from "zod";
import type { RouteConfig } from "sveltekit-auto-openapi/types";

const CreateUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  age: z.number().int().min(18).optional(),
});

export const _config = {
  openapiOverride: {
    POST: {
      summary: "Create user",
      requestBody: {
        content: {
          "application/json": {
            schema: CreateUserSchema.toJSONSchema(),
          },
        },
      },
      responses: {
        "201": {
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

export async function POST({ validated, json }) {
  const user = validated.body; // Type: { email: string; password: string; age?: number }

  // Create user...
  return json({ id: "123", email: user.email });
}
```

**Zod benefits:**

- Best TypeScript integration
- Comprehensive validation rules
- Great error messages
- Large ecosystem

### TypeBox

JSON Schema-native with TypeScript types:

```typescript
import { Type } from "@sinclair/typebox";
import type { RouteConfig } from "sveltekit-auto-openapi/types";

const CreateProductSchema = Type.Object({
  name: Type.String({ minLength: 1 }),
  price: Type.Number({ minimum: 0 }),
  category: Type.Union([
    Type.Literal("electronics"),
    Type.Literal("clothing"),
    Type.Literal("food"),
  ]),
});

export const _config = {
  openapiOverride: {
    POST: {
      summary: "Create product",
      requestBody: {
        content: {
          "application/json": {
            schema: CreateProductSchema,
          },
        },
      },
      responses: {
        "201": {
          description: "Product created",
          content: {
            "application/json": {
              schema: Type.Object({
                id: Type.String(),
                name: Type.String(),
              }),
            },
          },
        },
      },
    },
  },
} satisfies RouteConfig;
```

**TypeBox benefits:**

- Generates pure JSON Schema directly
- Smaller bundle size than Zod
- Fast validation performance
- OpenAPI-friendly

### Valibot

Modern, modular schema library:

```typescript
import * as v from "valibot";
import type { RouteConfig } from "sveltekit-auto-openapi/types";

const CreateOrderSchema = v.object({
  items: v.array(
    v.object({
      productId: v.string(),
      quantity: v.number([v.minValue(1)]),
    })
  ),
  shippingAddress: v.object({
    street: v.string(),
    city: v.string(),
    zipCode: v.string([v.regex(/^\d{5}$/)]),
  }),
});

export const _config = {
  openapiOverride: {
    POST: {
      summary: "Create order",
      requestBody: {
        content: {
          "application/json": {
            schema: v.toJSONSchema(CreateOrderSchema),
          },
        },
      },
    },
  },
} satisfies RouteConfig;
```

**Valibot benefits:**

- Tree-shakeable (smaller bundles)
- Modular design
- Fast performance
- Modern API

### ArkType

Type-first runtime validation:

```typescript
import { type } from "arktype";
import type { RouteConfig } from "sveltekit-auto-openapi/types";

const loginSchema = type({
  email: "email",
  password: "string>8",
  rememberMe: "boolean?",
});

export const _config = {
  openapiOverride: {
    POST: {
      summary: "Login",
      requestBody: {
        content: {
          "application/json": {
            schema: loginSchema.toJSONSchema(),
          },
        },
      },
    },
  },
} satisfies RouteConfig;
```

**ArkType benefits:**

- Concise type syntax
- Runtime type inference
- Fast validation
- Minimal boilerplate

## Using Raw JSON Schema

If you don't want to use a StandardSchema library, use pure JSON Schema:

```typescript
import type { RouteConfig } from "sveltekit-auto-openapi/types";

export const _config = {
  openapiOverride: {
    POST: {
      summary: "Create resource",
      requestBody: {
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                name: {
                  type: "string",
                  minLength: 1,
                  maxLength: 100,
                },
                email: {
                  type: "string",
                  format: "email",
                  pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
                },
                tags: {
                  type: "array",
                  items: { type: "string" },
                  minItems: 1,
                  maxItems: 10,
                  uniqueItems: true,
                },
                metadata: {
                  type: "object",
                  additionalProperties: { type: "string" },
                },
              },
              required: ["name", "email"],
              additionalProperties: false,
            },
          },
        },
      },
    },
  },
} satisfies RouteConfig;
```

**When to use raw JSON Schema:**

- No dependencies desired
- Sharing schemas with non-TypeScript systems
- Maximum OpenAPI compatibility
- Precise control over validation

## Validation Locations

### Headers

Validate request headers:

```typescript
requestBody: {
  $headers: {
    schema: {
      type: 'object',
      properties: {
        'authorization': { type: 'string', pattern: '^Bearer .+$' },
        'x-api-key': { type: 'string' },
        'content-type': { type: 'string', const: 'application/json' }
      },
      required: ['authorization']
    }
  }
}
```

Access in handler:

```typescript
export async function POST({ validated, error }) {
  const { authorization } = validated.headers;

  if (!isValidToken(authorization)) {
    error(401, { error: "Invalid token" });
  }

  // ...
}
```

### Cookies

Validate cookies:

```typescript
requestBody: {
  $cookies: {
    schema: {
      type: 'object',
      properties: {
        session: { type: 'string' },
        preferences: { type: 'string' }
      },
      required: ['session']
    }
  }
}
```

Access in handler:

```typescript
const { session, preferences } = validated.cookies;
```

### Query Parameters

Validate URL query parameters:

```typescript
requestBody: {
  $query: {
    schema: {
      type: 'object',
      properties: {
        page: { type: 'number', minimum: 1, default: 1 },
        limit: { type: 'number', minimum: 1, maximum: 100, default: 20 },
        sort: { type: 'string', enum: ['asc', 'desc'] },
        filter: { type: 'string' }
      }
    }
  }
}
```

Access in handler:

```typescript
const { page, limit, sort, filter } = validated.query;
```

### Path Parameters

Validate route parameters:

```typescript
// src/routes/api/users/[userId]/posts/[postId]/+server.ts
requestBody: {
  $pathParams: {
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'string', pattern: '^[0-9]+$' },
        postId: { type: 'string', pattern: '^[0-9]+$' }
      },
      required: ['userId', 'postId']
    }
  }
}
```

Access in handler:

```typescript
const { userId, postId } = validated.pathParams;
```

### Request Body

Validate JSON request body:

```typescript
requestBody: {
  content: {
    'application/json': {
      schema: {
        type: 'object',
        properties: {
          title: { type: 'string', minLength: 1 },
          content: { type: 'string' },
          published: { type: 'boolean', default: false }
        },
        required: ['title', 'content']
      }
    }
  }
}
```

Access in handler:

```typescript
const { title, content, published } = validated.body;
```

### Response Body

Validate response data:

```typescript
responses: {
  '200': {
    description: 'Success',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' }
          },
          required: ['id', 'title', 'createdAt']
        }
      }
    }
  }
}
```

Return from handler:

```typescript
return json({
  id: "123",
  title: "My Post",
  createdAt: new Date().toISOString(),
});
```

## Error Handling

### Default Errors

By default, validation errors return simple 400 responses:

```ts
{
  "error": "Validation failed"
}
```

### Detailed Errors

Enable detailed errors for debugging:

```typescript
requestBody: {
  content: {
    'application/json': {
      $_returnDetailedError: true,
      schema: { /* ... */ }
    }
  }
}
```

Detailed error format:

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

### Custom Error Messages

Define custom error responses:

```typescript
responses: {
  '400': {
    description: 'Validation error',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            code: { type: 'string' },
            field: { type: 'string' }
          }
        }
      }
    }
  }
}
```

## Skipping Validation

### Global Defaults

Skip validation globally in plugin config:

```typescript
// vite.config.ts
svelteOpenApi({
  skipValidationDefault: {
    request: {
      headers: true, // Skip header validation
      cookies: true, // Skip cookie validation
      query: false, // Validate query params
      pathParams: false, // Validate path params
      body: false, // Validate body
    },
    response: true, // Skip response validation
  },
});
```

### Per-Route

Override global defaults per route:

```typescript
requestBody: {
  $headers: {
    $_skipValidation: false,  // Validate headers for this route
    schema: { /* ... */ }
  }
}
```

### Per-Field

Skip validation for specific content types:

```typescript
requestBody: {
  content: {
    'application/json': {
      $_skipValidation: true,  // Skip body validation
      schema: { /* ... */ }
    }
  },
  $headers: {
    $_skipValidation: false,  // But validate headers
    schema: { /* ... */ }
  }
}
```

## Best Practices

### Choose the Right Tool

- **Zod**: Best TypeScript integration, use for most projects
- **TypeBox**: When bundle size matters, OpenAPI-first projects
- **Valibot**: Modern alternative to Zod, smaller bundles
- **ArkType**: Concise syntax, runtime types
- **JSON Schema**: No dependencies, maximum compatibility

### Validate Defensively

Always validate:

- User input (body, query, path params)
- External data (API responses, file uploads)
- Authentication tokens

Consider skipping:

- Trusted internal data
- Responses in production (performance)
- Non-critical fields

### Use Detailed Errors in Development

```typescript
const isDev = import.meta.env.DEV;

requestBody: {
  content: {
    'application/json': {
      $_returnDetailedError: isDev,  // Only in development
      schema: { /* ... */ }
    }
  }
}
```

### Reuse Schemas

Create shared validation schemas:

```typescript
// src/lib/validation/schemas.ts
import { z } from "zod";

export const EmailSchema = z.string().email();
export const PasswordSchema = z.string().min(8).max(100);
export const IdSchema = z.string().regex(/^[0-9]+$/);

export const PaginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export const TimestampsSchema = z.object({
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
```

Use across routes:

```typescript
import { EmailSchema, PasswordSchema } from "$lib/validation/schemas";

const LoginSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
});
```

### Test Validation

Write tests for validation logic:

```typescript
import { describe, test, expect } from "bun:test";

describe("User validation", () => {
  test("accepts valid email", async () => {
    const response = await POST({
      request: {
        json: async () => ({
          email: "test@example.com",
          password: "securepass",
        }),
      },
    });
    expect(response.status).toBe(201);
  });

  test("rejects invalid email", async () => {
    const response = await POST({
      request: {
        json: async () => ({ email: "invalid", password: "securepass" }),
      },
    });
    expect(response.status).toBe(400);
  });
});
```

## Related Documentation

- [Route Configuration](/fundamentals/route-config/) - Defining schemas in `_config`
- [Error Handling](/guides/error-handling/) - Advanced error patterns
- [Validation Wrapper](/advanced/validation-wrapper/) - How validation works internally
- [Plugin Configuration](/fundamentals/plugin/) - Global validation settings
