---
title: Route Configuration
description: Configure individual routes with OpenAPI schemas and validation
---

# Route Configuration

The `_config` export is how you configure individual API routes with OpenAPI schemas and runtime validation. It's the primary interface between your code and the plugin.

## The _config Export

Export a `_config` object from any `+server.ts` file to:

- Define OpenAPI documentation for the route
- Enable runtime validation for requests and responses
- Add metadata like summaries and descriptions
- Control validation behavior with flags

```typescript
// src/routes/api/users/+server.ts
import type { RouteConfig } from 'sveltekit-auto-openapi/types';

export const _config = {
  openapiOverride: {
    POST: {
      summary: 'Create user',
      // ... OpenAPI schema
    }
  }
} satisfies RouteConfig;

export async function POST({ validated, json, error }) {
  // Handler implementation
}
```

**Why it exists:**

Without `_config`, the plugin can only infer basic schemas from type annotations. With `_config`, you get:
- Runtime validation
- Detailed documentation
- Type-safe helpers (`validated`, `json()`, `error()`)
- Full control over OpenAPI schema

## RouteConfig Structure

The `RouteConfig` type has a single property:

```typescript
interface RouteConfig {
  openapiOverride?: PathItemObject;
}
```

### PathItemObject

A `PathItemObject` maps HTTP methods to operation definitions:

```typescript
type PathItemObject = {
  $ref?: string;
  summary?: string;
  description?: string;
  servers?: OpenAPIV3.ServerObject[];
  parameters?: (OpenAPIV3.ReferenceObject | OpenAPIV3.ParameterObject)[];
  GET?: OperationObjectWithValidation;
  POST?: OperationObjectWithValidation;
  PUT?: OperationObjectWithValidation;
  DELETE?: OperationObjectWithValidation;
  PATCH?: OperationObjectWithValidation;
  // ... other HTTP methods
};
```

### OperationObjectWithValidation

Each HTTP method uses an `OperationObjectWithValidation`:

```typescript
type OperationObjectWithValidation = {
  summary?: string;
  description?: string;
  tags?: string[];
  operationId?: string;

  // Custom validation properties ($ prefix)
  $allowedStatusCodes?: OpenApiResponseKey[];

  // Standard OpenAPI with validation extensions
  requestBody?: {
    // Custom $ properties for granular validation
    $headers?: ValidationSchemaConfig;
    $query?: ValidationSchemaConfig;
    $pathParams?: ValidationSchemaConfig;
    $cookies?: ValidationSchemaConfig;

    // Standard OpenAPI content
    content?: {
      'application/json'?: MediaTypeWithValidation;
    };
  };

  responses?: {
    '200'?: ResponseObjectWithValidation;
    '400'?: ResponseObjectWithValidation;
    // ... other status codes
  };

  // Standard OpenAPI properties
  parameters?: ParameterObject[];
  // ... more OpenAPI fields
};
```

## Defining Schemas

### Standard OpenAPI Structure

Follow standard OpenAPI 3.0 structure for maximum compatibility:

```typescript
export const _config = {
  openapiOverride: {
    POST: {
      summary: 'Create user',
      description: 'Creates a new user account',
      tags: ['users'],

      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                email: {
                  type: 'string',
                  format: 'email'
                },
                name: {
                  type: 'string',
                  minLength: 1
                }
              },
              required: ['email', 'name']
            }
          }
        }
      },

      responses: {
        '201': {
          description: 'User created successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  email: { type: 'string' }
                }
              }
            }
          }
        },
        '400': {
          description: 'Invalid request',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  message: { type: 'string' }
                }
              }
            }
          }
        }
      }
    }
  }
} satisfies RouteConfig;
```

### Custom $ Properties

SvelteKit Auto OpenAPI extends OpenAPI with custom `$` properties for validation that doesn't fit standard OpenAPI structure:

#### $headers - Request Header Validation

```typescript
requestBody: {
  $headers: {
    schema: {
      type: 'object',
      properties: {
        'x-api-key': { type: 'string' },
        'x-request-id': { type: 'string', format: 'uuid' }
      },
      required: ['x-api-key']
    }
  }
}
```

Access validated headers:
```typescript
const { 'x-api-key': apiKey } = validated.headers;
```

#### $query - Query Parameter Validation

```typescript
requestBody: {
  $query: {
    schema: {
      type: 'object',
      properties: {
        page: { type: 'number', minimum: 1 },
        limit: { type: 'number', maximum: 100 }
      }
    }
  }
}
```

Access validated query params:
```typescript
const { page, limit } = validated.query;
```

#### $pathParams - Path Parameter Validation

```typescript
// src/routes/api/users/[id]/+server.ts
requestBody: {
  $pathParams: {
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', pattern: '^[0-9]+$' }
      },
      required: ['id']
    }
  }
}
```

Access validated path params:
```typescript
const { id } = validated.pathParams;
```

#### $cookies - Cookie Validation

```typescript
requestBody: {
  $cookies: {
    schema: {
      type: 'object',
      properties: {
        session: { type: 'string' }
      }
    }
  }
}
```

Access validated cookies:
```typescript
const { session } = validated.cookies;
```

#### $allowedStatusCodes - Restrict Response Codes

Restrict which status codes your handler can return:

```typescript
POST: {
  $allowedStatusCodes: ['200', '400', '404'],
  // ...
}
```

The validation wrapper will throw if your handler returns a status code not in this list.

## Validation Flags

### $_skipValidation

Skip validation for a specific schema or field:

**Skip entire request body validation:**
```typescript
requestBody: {
  content: {
    'application/json': {
      $_skipValidation: true,
      schema: { /* ... */ }
    }
  }
}
```

**Skip specific parts:**
```typescript
requestBody: {
  $headers: {
    $_skipValidation: true,  // Don't validate headers
    schema: { /* ... */ }
  },
  $query: {
    $_skipValidation: false,  // Do validate query
    schema: { /* ... */ }
  }
}
```

**Skip response validation:**
```typescript
responses: {
  '200': {
    content: {
      'application/json': {
        $_skipValidation: true,
        schema: { /* ... */ }
      }
    }
  }
}
```

### $_returnDetailedError

Return detailed validation errors instead of simple messages:

**Enable for request body:**
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

**Simple error (default):**
```json
{
  "error": "Validation failed"
}
```

**Detailed error:**
```json
{
  "error": "Validation failed",
  "details": [
    {
      "instancePath": "/email",
      "keyword": "format",
      "message": "must match format \"email\""
    }
  ]
}
```

## Complete Examples

### Level 1: Automatic (AST Inference Only)

No `_config` needed - plugin infers from types:

```typescript
// src/routes/api/hello/+server.ts
import { json } from '@sveltejs/kit';

export async function POST({ request }) {
  const { name }: { name: string } = await request.json();
  return json({ message: `Hello, ${name}!` });
}
```

**What you get:**
- Basic OpenAPI schema from type annotations
- No runtime validation
- Standard SvelteKit RequestEvent

### Level 2: With Validation (Using StandardSchema)

Using Zod for schemas (you can also use TypeBox, Valibot, ArkType):

```typescript
// src/routes/api/users/+server.ts
import { z } from 'zod';
import type { RouteConfig } from 'sveltekit-auto-openapi/types';

const UserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  age: z.number().int().min(18).optional()
});

export const _config = {
  openapiOverride: {
    POST: {
      summary: 'Create user',
      description: 'Creates a new user account',

      requestBody: {
        content: {
          'application/json': {
            schema: UserSchema.toJSONSchema()
          }
        }
      },

      responses: {
        '201': {
          description: 'User created',
          content: {
            'application/json': {
              schema: z.object({
                id: z.string(),
                email: z.string()
              }).toJSONSchema()
            }
          }
        }
      }
    }
  }
} satisfies RouteConfig;

export async function POST({ validated, json, error }) {
  const user = validated.body;  // Fully typed!

  // Create user logic...
  const newUser = { id: '123', email: user.email };

  return json(newUser);  // Type-checked against 201 schema
}
```

### Level 3: Raw JSON Schema

Pure JSON Schema without dependencies:

```typescript
// src/routes/api/products/+server.ts
import type { RouteConfig } from 'sveltekit-auto-openapi/types';

export const _config = {
  openapiOverride: {
    POST: {
      summary: 'Create product',

      requestBody: {
        // Validate headers
        $headers: {
          schema: {
            type: 'object',
            properties: {
              'x-api-key': { type: 'string' }
            },
            required: ['x-api-key']
          }
        },

        // Validate query params
        $query: {
          schema: {
            type: 'object',
            properties: {
              draft: { type: 'boolean' }
            }
          }
        },

        // Validate body
        content: {
          'application/json': {
            $_returnDetailedError: true,  // Detailed errors for debugging
            schema: {
              type: 'object',
              properties: {
                name: { type: 'string', minLength: 1 },
                price: { type: 'number', minimum: 0 },
                category: {
                  type: 'string',
                  enum: ['electronics', 'clothing', 'food']
                }
              },
              required: ['name', 'price', 'category'],
              additionalProperties: false
            }
          }
        }
      },

      responses: {
        '201': {
          description: 'Product created',
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
        '400': {
          description: 'Validation error',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  error: { type: 'string' },
                  details: {
                    type: 'array',
                    items: { type: 'object' }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
} satisfies RouteConfig;

export async function POST({ validated, json, error }) {
  const { 'x-api-key': apiKey } = validated.headers;
  const { draft } = validated.query;
  const product = validated.body;

  // All inputs are validated before this runs

  if (apiKey !== process.env.API_KEY) {
    error(401, { error: 'Invalid API key' });
  }

  // Create product...
  const newProduct = { id: '456', name: product.name };

  return json(newProduct);
}
```

### Full Example: All Features

Combining everything:

```typescript
// src/routes/api/orders/[id]/+server.ts
import type { RouteConfig } from 'sveltekit-auto-openapi/types';

export const _config = {
  openapiOverride: {
    PUT: {
      summary: 'Update order',
      description: 'Updates an existing order',
      tags: ['orders'],

      // Only allow these status codes
      $allowedStatusCodes: ['200', '400', '404'],

      requestBody: {
        // Validate path parameters
        $pathParams: {
          schema: {
            type: 'object',
            properties: {
              id: { type: 'string', pattern: '^[0-9]+$' }
            },
            required: ['id']
          }
        },

        // Validate headers
        $headers: {
          $_skipValidation: false,  // Explicitly enable
          $_returnDetailedError: false,  // Simple errors for security
          schema: {
            type: 'object',
            properties: {
              'authorization': { type: 'string' }
            },
            required: ['authorization']
          }
        },

        // Validate query
        $query: {
          schema: {
            type: 'object',
            properties: {
              notify: { type: 'boolean' }
            }
          }
        },

        // Validate body
        content: {
          'application/json': {
            $_returnDetailedError: true,  // Detailed for debugging
            schema: {
              type: 'object',
              properties: {
                status: {
                  type: 'string',
                  enum: ['pending', 'processing', 'shipped', 'delivered']
                },
                trackingNumber: { type: 'string' }
              },
              required: ['status']
            }
          }
        }
      },

      responses: {
        '200': {
          description: 'Order updated',
          content: {
            'application/json': {
              $_skipValidation: true,  // Skip response validation
              schema: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  status: { type: 'string' }
                }
              }
            }
          }
        },
        '400': {
          description: 'Invalid request',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  error: { type: 'string' },
                  details: { type: 'array' }
                }
              }
            }
          }
        },
        '404': {
          description: 'Order not found',
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
        }
      }
    }
  }
} satisfies RouteConfig;

export async function PUT({ params, validated, json, error }) {
  // All validated inputs available
  const { id } = validated.pathParams;
  const { authorization } = validated.headers;
  const { notify } = validated.query;
  const { status, trackingNumber } = validated.body;

  // Verify auth
  if (!isValidToken(authorization)) {
    error(401, { error: 'Unauthorized' });
  }

  // Find order
  const order = await findOrder(id);
  if (!order) {
    error(404, { error: 'Order not found' });
  }

  // Update order
  order.status = status;
  if (trackingNumber) {
    order.trackingNumber = trackingNumber;
  }
  await order.save();

  // Send notification if requested
  if (notify) {
    await sendNotification(order);
  }

  return json({ id: order.id, status: order.status });
}
```

## Best Practices

### Schema Reusability

Define shared schemas once:

```typescript
// src/lib/schemas.ts
export const ErrorSchema = {
  type: 'object',
  properties: {
    error: { type: 'string' },
    code: { type: 'string' }
  },
  required: ['error']
} as const;

export const PaginationQuerySchema = {
  type: 'object',
  properties: {
    page: { type: 'number', minimum: 1, default: 1 },
    limit: { type: 'number', minimum: 1, maximum: 100, default: 20 }
  }
} as const;
```

Reuse across routes:

```typescript
import { ErrorSchema, PaginationQuerySchema } from '$lib/schemas';

export const _config = {
  openapiOverride: {
    GET: {
      requestBody: {
        $query: { schema: PaginationQuerySchema }
      },
      responses: {
        '400': {
          content: {
            'application/json': {
              schema: ErrorSchema
            }
          }
        }
      }
    }
  }
} satisfies RouteConfig;
```

### Type Safety with satisfies

Always use `satisfies RouteConfig`:

```typescript
// ✅ Good - catches typos and type errors
export const _config = {
  openapiOverride: { /* ... */ }
} satisfies RouteConfig;

// ❌ Bad - no type checking
export const _config = {
  openapiOverride: { /* ... */ }
};
```

### Documentation Quality

Write clear summaries and descriptions:

```typescript
POST: {
  summary: 'Create user account',  // Verb + noun
  description: 'Creates a new user account with the provided email and password. Sends a verification email upon successful creation.',
  tags: ['users', 'authentication'],
  // ...
}
```

## Related Documentation

- [Plugin Configuration](/fundamentals/plugin/) - Global validation defaults
- [Validation Guide](/guides/validation/) - Using Zod, TypeBox, and other libraries
- [Type System](/advanced/type-system/) - Understanding type extraction
- [Validation Wrapper](/advanced/validation-wrapper/) - How validation works internally
