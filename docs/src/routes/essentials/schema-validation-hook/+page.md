---
title: Schema Validation Hook
description: Configure runtime request and response validation
---

# Schema Validation Hook

The schema validation hook is a SvelteKit handle hook that validates incoming requests and optionally outgoing responses against your schemas.

## Basic Setup

Add the hook to `src/hooks.server.ts`:

```ts
import { sequence } from "@sveltejs/kit/hooks";
import { createSchemaValidationHook } from "sveltekit-auto-openapi/schema-validation-hook";

export const handle = sequence(
  createSchemaValidationHook({
    validateOutput: import.meta.env.DEV,
  })
);
```

## Configuration Options

### `validateOutput`

Controls whether response validation is enabled.

```ts
createSchemaValidationHook({
  validateOutput: import.meta.env.DEV, // Only validate in development
});
```

**Recommended:**

- `true` in development - Catch response validation errors early
- `false` in production - Avoid performance overhead

## How It Works

The validation hook intercepts every request:

1. **Route Matching** - Converts SvelteKit route ID to OpenAPI path format
2. **Config Lookup** - Loads validation configuration from virtual module
3. **Input Validation** - Validates headers, cookies, query params, and body
4. **Handler Execution** - Calls your route handler if validation passes
5. **Output Validation** - Validates response (if enabled)

## Validation Flow

```
Request
  │
  ├─> Has validation config?
  │     │
  │     ├─> No  ──> Pass through to handler
  │     │
  │     └─> Yes ──> Validate input
  │                   │
  │                   ├─> Validation fails ──> Return 400 Error
  │                   │
  │                   └─> Validation passes ──> Call handler
  │                                                │
  │                                                └─> Response
  │                                                      │
  │                                                      ├─> validateOutput disabled ──> Return response
  │                                                      │
  │                                                      └─> validateOutput enabled
  │                                                            │
  │                                                            ├─> Output validation fails ──> Return 500 Error
  │                                                            │
  │                                                            └─> Output validation passes ──> Return response
```

## Validated Properties

### Request (Input)

- **Headers** - via `$headers` in `_config`
- **Cookies** - via `$cookies` in `_config`
- **Query Parameters** - via `$query` in `_config`
- **Path Parameters** - via `$pathParams` in `_config`
- **Request Body** - via `requestBody` in `_config`

### Response (Output)

- **Headers** - via `responses[statusCode].headers`
- **Cookies** - via response `Set-Cookie` validation
- **Response Body** - via `responses[statusCode].content`

## Error Handling

### Validation Errors (400 Bad Request)

When input validation fails:

```js
{
  "error": "Validation failed",
  "details": [
    {
      "path": "/email",
      "message": "must be a valid email",
      "keyword": "format"
    }
  ]
}
```

**Error detail visibility:**

- Development: Detailed errors with `$showErrorMessage: true`
- Production: Generic errors for security

### Response Validation Errors (500 Internal Server Error)

When output validation fails (only if `validateOutput: true`):

```js
{
  "error": "Response validation failed",
  "details": [...]
}
```

## Performance Considerations

### Input Validation

- Minimal overhead (~1-2ms per request)
- Uses fast `@cfworker/json-schema` validator
- Only validates routes with `_config` exports

### Output Validation

- Additional overhead (~1-2ms per response)
- Recommended for development only
- Disable in production for better performance

## Validation Registry

The hook uses the validation registry from the virtual module:

```ts
{
  "/api/users/{id}": {
    POST: {
      hasInput: true,
      hasOutput: true,
      input: { /* validation schemas */ },
      output: { /* validation schemas */ }
    }
  }
}
```

## Special Behaviors

### Skip Validation

Use `$skipValidation: true` to disable validation for specific schemas:

```ts
$headers: {
  $skipValidation: true,
  schema: z.object({ ... })
}
```

### Show Error Messages

Control error message detail with `$showErrorMessage`:

```ts
requestBody: {
  content: {
    "application/json": {
      $showErrorMessage: import.meta.env.DEV, // Detailed errors in dev only
      schema: z.object({ ... })
    }
  }
}
```

### Unimplemented Handlers

If a route has `_config` but no handler function, returns:

```
501 Not Implemented
```

## Alternative: useValidation

For better performance and memory efficiency, consider using the [`useValidation`](/essentials/use-validation/) request handler instead:

### Global Hook vs useValidation

| Feature          | Global Hook                             | useValidation                               |
| ---------------- | --------------------------------------- | ------------------------------------------- |
| **Setup**        | One-time in hooks.server.ts             | Per-route in +server.ts                     |
| **Memory Usage** | Loads all schemas (~5MB for 100 routes) | Loads only needed schemas (~50KB per route) |
| **Type Safety**  | Manual type casting required            | Automatic type inference                    |
| **Performance**  | Slight overhead at startup              | No startup overhead                         |
| **Best For**     | Small apps (<20 routes)                 | Medium/large apps (20+ routes)              |

**Example with useValidation:**

```ts
import { useValidation } from "sveltekit-auto-openapi/request-handler";
import type { RouteConfig } from "sveltekit-auto-openapi/request-handler";

export const _config = {
  /* same config */
} satisfies RouteConfig;

export const POST = useValidation(
  "POST",
  _config,
  async ({ validated, json, error }) => {
    // Fully typed and validated inputs
    const { body, headers } = validated;
    return json({ success: true });
  }
);
```

See the [useValidation documentation](/essentials/use-validation/) for more details.

## Next Steps

- Learn how to configure validation in [Advanced RouteConfig](/essentials/usage-in-server-routes/advanced-route-config/)
- Explore [useValidation](/essentials/use-validation/) for optimized per-route validation
- Explore [Validation Flags](/advanced/validation-flags/) for detailed control
- See the [Scalar Module](/essentials/scalar-module/) for API documentation
