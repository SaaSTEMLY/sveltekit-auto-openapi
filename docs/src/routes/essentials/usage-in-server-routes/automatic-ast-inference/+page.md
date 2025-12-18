---
title: Automatic (AST Inference)
description: Let SvelteKit Auto OpenAPI infer schemas from your TypeScript types
---

# Automatic (AST Inference)

The simplest way to use SvelteKit Auto OpenAPI is to write standard SvelteKit code with TypeScript types. The library analyzes your code and generates OpenAPI schemas automatically.

## How It Works

The Vite plugin uses TypeScript AST (Abstract Syntax Tree) parsing to extract type information from your code. No decorators, no special syntax - just standard TypeScript.

## Basic Example

```ts
// src/routes/api/auth/+server.ts
import { json } from "@sveltejs/kit";

export async function POST({ request }) {
  const { email }: { email: string } = await request.json();
  return json({ success: true });
}
```

This automatically generates:

```js
{
  "paths": {
    "/api/auth": {
      "post": {
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "email": { "type": "string" }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": { "type": "boolean" }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
```

## Supported Patterns

### Request Body Inference

The plugin detects three patterns for request body types:

#### Pattern 1: Generic Type Parameter

```ts
export async function POST({ request }) {
  const body = await request.json<{ email: string }>();
  return json({ success: true });
}
```

#### Pattern 2: Variable Type Annotation

```ts
export async function POST({ request }) {
  const { email }: { email: string } = await request.json();
  return json({ success: true });
}
```

#### Pattern 3: Type Assertion

```ts
export async function POST({ request }) {
  const body = await request.json() as { email: string };
  return json({ success: true });
}
```

### Response Inference

The plugin analyzes `json()` return statements:

```ts
export async function GET() {
  return json({
    id: 1,
    name: "John"
  }, {
    status: 200
  });
}
```

Generates response schema for status 200.

### Path Parameters

Path parameters are automatically extracted from file names:

```ts
// src/routes/api/users/[id]/+server.ts
export async function GET({ params }) {
  const { id } = params;
  return json({ user: { id } });
}
```

Generates:

```js
{
  "paths": {
    "/api/users/{id}": {
      "get": {
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": { "type": "string" }
          }
        ]
      }
    }
  }
}
```

## Type Mapping

TypeScript types are mapped to OpenAPI/JSON Schema:

| TypeScript | OpenAPI Schema |
|------------|----------------|
| `string` | `{ type: "string" }` |
| `number` | `{ type: "number" }` |
| `boolean` | `{ type: "boolean" }` |
| `Type[]` | `{ type: "array", items: {...} }` |
| `{ key: value }` | `{ type: "object", properties: {...} }` |

## Limitations

### What Gets Inferred

- Request body types from `request.json<Type>()`
- Response types from `json(...)` calls
- Path parameters from file names
- HTTP methods (GET, POST, PUT, DELETE, PATCH)

### What Doesn't Get Inferred

- Headers, cookies, query parameters (use `_config`)
- Complex union types
- Conditional types
- Detailed documentation (use `_config`)
- Validation rules (use `_config`)

## When to Use Automatic Inference

Automatic inference is perfect for:

- **Rapid prototyping** - Get docs without extra configuration
- **Simple APIs** - Basic CRUD operations
- **Internal tools** - Quick internal APIs
- **Development** - Iterate quickly during development

## When to Upgrade to `_config`

Consider using `_config` when you need:

- **Runtime validation** - Validate requests before they reach your handler
- **Header validation** - Validate API keys, content types
- **Query/cookie validation** - Validate query parameters or cookies
- **Detailed documentation** - Add summaries, descriptions, examples
- **Error handling** - Return proper validation errors

## Example: Complete Route

```ts
// src/routes/api/users/[id]/+server.ts
import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

interface User {
  id: string;
  name: string;
  email: string;
}

export const GET: RequestHandler = async ({ params }) => {
  const { id } = params;

  // Simulate database lookup
  const user: User = {
    id,
    name: "John Doe",
    email: "john@example.com",
  };

  if (!user) {
    throw error(404, "User not found");
  }

  return json(user);
};

export const PUT: RequestHandler = async ({ params, request }) => {
  const { id } = params;
  const updates: Partial<User> = await request.json();

  // Simulate database update
  const user: User = {
    id,
    name: updates.name ?? "John Doe",
    email: updates.email ?? "john@example.com",
  };

  return json(user);
};
```

This generates complete OpenAPI docs for both GET and PUT endpoints!

## Next Steps

- Learn about [Advanced RouteConfig](/essentials/usage-in-server-routes/advanced-route-config/) for validation
- Explore [Validation Flags](/advanced/validation-flags/) for detailed error control
- See [Type Safety](/advanced/type-safety/) for type extraction from configs
