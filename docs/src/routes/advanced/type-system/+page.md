---
title: Type System
description: TypeScript type utilities for schema-based type inference
---

# Type System

The type system provides TypeScript utilities for extracting types from OpenAPI schemas and `_config` exports, enabling end-to-end type safety from request to response.

## TypeScript Integration

SvelteKit Auto OpenAPI achieves type safety through:

1. **Schema-to-Type extraction** - Convert JSON Schema to TypeScript types
2. **Config-to-Type extraction** - Extract types from `_config` exports
3. **Helper injection** - Augment RequestEvent with typed helpers
4. **Compile-time validation** - TypeScript checks schema compliance

## Key Type Utilities

### ExtractSchemaType<T>

Extracts TypeScript type from a JSON Schema or StandardSchema object.

**Signature:**

```typescript
type ExtractSchemaType<T> = /* complex type */
```

**Supports:**
- **StandardSchema** (Zod, TypeBox, etc.) via `~standard.types.output`
- **JSON Schema** primitives (`string`, `number`, `boolean`)
- **Objects** with properties
- **Arrays** with items
- **Literals** with const values
- **Unions** and **intersections**

**Examples:**

```typescript
import type { ExtractSchemaType } from 'sveltekit-auto-openapi/types';

// From StandardSchema (Zod)
const UserSchema = z.object({
  id: z.string(),
  email: z.string().email()
});

type User = ExtractSchemaType<typeof UserSchema>;
// { id: string; email: string }

// From JSON Schema
const ProductSchema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    price: { type: 'number' }
  },
  required: ['name', 'price']
} as const;

type Product = ExtractSchemaType<typeof ProductSchema>;
// { name: string; price: number }

// From array schema
const TagsSchema = {
  type: 'array',
  items: { type: 'string' }
} as const;

type Tags = ExtractSchemaType<typeof TagsSchema>;
// string[]

// From const/literal
const StatusSchema = {
  const: 'active'
} as const;

type Status = ExtractSchemaType<typeof StatusSchema>;
// 'active'
```

### ExtractSuccessResponseType<TMethod>

Extracts the TypeScript type for success responses (2XX status codes).

**Signature:**

```typescript
type ExtractSuccessResponseType<TMethod> = /* union of 2XX response types */
```

**Example:**

```typescript
import type { ExtractSuccessResponseType } from 'sveltekit-auto-openapi/types';

const methodConfig = {
  responses: {
    '200': {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' }
            }
          }
        }
      }
    },
    '201': {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              id: { type: 'string' }
            }
          }
        }
      }
    }
  }
};

type SuccessResponse = ExtractSuccessResponseType<typeof methodConfig>;
// { id: string; name: string } | { id: string }
```

### ExtractErrorResponseType<TMethod>

Extracts the TypeScript type for error responses (4XX, 5XX, and default).

**Signature:**

```typescript
type ExtractErrorResponseType<TMethod> = /* union of error response types */
```

**Example:**

```typescript
import type { ExtractErrorResponseType } from 'sveltekit-auto-openapi/types';

const methodConfig = {
  responses: {
    '400': {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              error: { type: 'string' }
            }
          }
        }
      }
    },
    '404': {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              error: { type: 'string' },
              code: { type: 'string' }
            }
          }
        }
      }
    }
  }
};

type ErrorResponse = ExtractErrorResponseType<typeof methodConfig>;
// { error: string } | { error: string; code: string }
```

### ExtractValidatedInputs<TMethod>

Extracts types for all validated request inputs.

**Signature:**

```typescript
type ExtractValidatedInputs<TMethod> = {
  body?: /* extracted body type */;
  query?: /* extracted query type */;
  pathParams?: /* extracted path params type */;
  headers?: /* extracted headers type */;
  cookies?: /* extracted cookies type */;
}
```

**Example:**

```typescript
import type { ExtractValidatedInputs } from 'sveltekit-auto-openapi/types';

const methodConfig = {
  requestBody: {
    $headers: {
      schema: {
        type: 'object',
        properties: {
          authorization: { type: 'string' }
        }
      }
    },
    $query: {
      schema: {
        type: 'object',
        properties: {
          page: { type: 'number' }
        }
      }
    },
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            email: { type: 'string' }
          }
        }
      }
    }
  }
};

type Inputs = ExtractValidatedInputs<typeof methodConfig>;
// {
//   body: { email: string };
//   query: { page: number };
//   headers: { authorization: string };
// }
```

### Method-Specific Extractors

Extract types for specific HTTP methods:

#### ExtractSuccessResponseTypeForMethod<TConfig, TMethod>

```typescript
import type { ExtractSuccessResponseTypeForMethod } from 'sveltekit-auto-openapi/types';

type UserConfig = typeof import('./routes/api/users/+server')._config;

type PostSuccess = ExtractSuccessResponseTypeForMethod<UserConfig, 'POST'>;
type GetSuccess = ExtractSuccessResponseTypeForMethod<UserConfig, 'GET'>;
```

#### ExtractErrorResponseTypeForMethod<TConfig, TMethod>

```typescript
import type { ExtractErrorResponseTypeForMethod } from 'sveltekit-auto-openapi/types';

type UserConfig = typeof import('./routes/api/users/+server')._config;

type PostErrors = ExtractErrorResponseTypeForMethod<UserConfig, 'POST'>;
// Union of all 4XX/5XX response types for POST
```

#### ExtractValidatedInputsForMethod<TConfig, TMethod>

```typescript
import type { ExtractValidatedInputsForMethod } from 'sveltekit-auto-openapi/types';

type UserConfig = typeof import('./routes/api/users/+server')._config;

type PostInputs = ExtractValidatedInputsForMethod<UserConfig, 'POST'>;
// { body: ..., query: ..., headers: ..., etc. }
```

### InjectedHelpers<Config, Method>

The complete type injected into RequestEvent by the sync helper.

**Signature:**

```typescript
type InjectedHelpers<Config, Method> = {
  validated: ExtractValidatedInputsForMethod<Config, Method>;
  json: TypedJsonFunction<ExtractSuccessResponseTypeForMethod<Config, Method>>;
  error: TypedErrorFunction<ExtractErrorResponseTypeForMethod<Config, Method>>;
}
```

**Example:**

```typescript
import type { InjectedHelpers } from 'sveltekit-auto-openapi/types';

type UserConfig = typeof import('./routes/api/users/+server')._config;

type PostHelpers = InjectedHelpers<UserConfig, 'POST'>;
// {
//   validated: { body: { email: string }, ... };
//   json: (data: { id: string; email: string }) => Response;
//   error: (status: number, body: { error: string }) => never;
// }
```

## Type Extraction

### From StandardSchema

StandardSchema libraries expose types via the `~standard` property:

```typescript
import { z } from 'zod';

const UserSchema = z.object({
  id: z.string(),
  email: z.string().email()
});

// StandardSchema exposes types
type User = typeof UserSchema['~standard']['types']['output'];
// { id: string; email: string }
```

The type system reads this automatically:

```typescript
type Extracted = ExtractSchemaType<typeof UserSchema>;
// { id: string; email: string }
```

### From JSON Schema

JSON Schema requires compile-time type inference:

```typescript
const UserSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    email: { type: 'string' }
  },
  required: ['id', 'email']
} as const;  // Important: as const

type User = ExtractSchemaType<typeof UserSchema>;
// { id: string; email: string }
```

**Key points:**
- Use `as const` for literal types
- Properties map to TypeScript properties
- `required` array determines optional vs required
- Nested objects work recursively

## Type Safety

### Request Validation Types

Types ensure validated data matches schemas:

```typescript
export const _config = {
  openapiOverride: {
    POST: {
      requestBody: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                email: { type: 'string' },
                age: { type: 'number' }
              },
              required: ['email']
            }
          }
        }
      }
    }
  }
} satisfies RouteConfig;

export async function POST({ validated }) {
  validated.body.email;  // string
  validated.body.age;    // number | undefined
  validated.body.foo;    // ❌ TypeScript error
}
```

### Response Validation Types

Types ensure responses match schemas:

```typescript
export const _config = {
  openapiOverride: {
    POST: {
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
    }
  }
} satisfies RouteConfig;

export async function POST({ json }) {
  // ✅ Valid - matches schema
  return json({ id: '123', email: 'user@example.com' });

  // ❌ TypeScript error - missing email
  return json({ id: '123' });

  // ❌ TypeScript error - extra property
  return json({ id: '123', email: 'user@example.com', foo: 'bar' });
}
```

### Error Type Safety

Error responses are type-checked:

```typescript
export const _config = {
  openapiOverride: {
    POST: {
      responses: {
        '404': {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  error: { type: 'string' },
                  code: { type: 'string' }
                },
                required: ['error', 'code']
              }
            }
          }
        }
      }
    }
  }
} satisfies RouteConfig;

export async function POST({ error }) {
  // ✅ Valid
  error(404, { error: 'Not found', code: 'NOT_FOUND' });

  // ❌ TypeScript error - missing code
  error(404, { error: 'Not found' });
}
```

## Advanced Patterns

### Shared Types Across Routes

Extract and reuse types:

```typescript
// src/lib/types.ts
import type { RouteConfig } from 'sveltekit-auto-openapi/types';
import type { ExtractValidatedInputsForMethod } from 'sveltekit-auto-openapi/types';

export type UserRouteConfig = RouteConfig & {
  openapiOverride: {
    POST: {
      requestBody: {
        content: {
          'application/json': {
            schema: {
              type: 'object';
              properties: {
                email: { type: 'string' };
                password: { type: 'string' };
              };
            };
          };
        };
      };
    };
  };
};

export type CreateUserInput = ExtractValidatedInputsForMethod<UserRouteConfig, 'POST'>['body'];
```

### Type-Safe API Client

Build clients with inferred types:

```typescript
import type { ExtractValidatedInputsForMethod, ExtractSuccessResponseTypeForMethod } from 'sveltekit-auto-openapi/types';

type UserConfig = typeof import('./routes/api/users/+server')._config;

class ApiClient {
  async createUser(
    data: ExtractValidatedInputsForMethod<UserConfig, 'POST'>['body']
  ): Promise<ExtractSuccessResponseTypeForMethod<UserConfig, 'POST'>> {
    const response = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    return response.json();
  }
}

const client = new ApiClient();

// Type-safe - autocomplete for input
await client.createUser({
  email: 'user@example.com',  // ✅ Required
  password: 'secure123'        // ✅ Required
});

// Type-safe - return type known
const user = await client.createUser({ /* ... */ });
user.id;     // string
user.email;  // string
```

### Conditional Types

Use conditional types for advanced scenarios:

```typescript
type IsRequired<T, K extends keyof T> =
  undefined extends T[K] ? false : true;

type ValidatedBody<TConfig> =
  ExtractValidatedInputsForMethod<TConfig, 'POST'>['body'];

type RequiredFields<T> = {
  [K in keyof T as IsRequired<T, K> extends true ? K : never]: T[K]
};
```

## Performance

### Compile-Time Only

All type utilities operate at compile-time:

- **Zero runtime cost** - Types are erased during compilation
- **No bundle impact** - Types don't appear in JavaScript output
- **Fast IDE experience** - TypeScript caches inferred types

### Type Complexity

Complex schemas can slow TypeScript:

```typescript
// Fast - simple schema
{ type: 'string' }

// Slower - deeply nested
{
  type: 'object',
  properties: {
    nested: {
      type: 'object',
      properties: {
        deep: {
          type: 'object',
          properties: {
            // ... 10+ levels
          }
        }
      }
    }
  }
}
```

**Optimization tips:**
- Keep schemas reasonably flat
- Use `satisfies` instead of explicit types when possible
- Split complex schemas into smaller parts

## Troubleshooting

### Types not inferred

**Problem:** `validated` shows `any` type

**Solutions:**
- Ensure `_config` uses `satisfies RouteConfig`
- Run `bunx svelte-kit sync`
- Check `.svelte-kit/types` was generated
- Restart TypeScript server

### Type errors in schemas

**Problem:** Schema doesn't type-check

**Solutions:**
- Use `as const` for JSON Schema objects
- Ensure schema structure is valid OpenAPI
- Check required/optional fields match

### Circular reference errors

**Problem:** TypeScript reports circular type reference

**Solutions:**
- Simplify schema structure
- Break circular references with explicit types
- Use `unknown` as escape hatch if needed

## Related Documentation

- [Route Configuration](/fundamentals/route-config/) - Defining schemas
- [Sync Helper](/advanced/sync-helper/) - Type injection
- [Validation Guide](/guides/validation/) - Using schemas for validation
