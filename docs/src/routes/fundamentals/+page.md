---
title: Fundamentals Overview
description: Understanding the core components of SvelteKit Auto OpenAPI
---

# Fundamentals

SvelteKit Auto OpenAPI consists of three core components that work together to provide automatic OpenAPI generation and runtime validation.

## The Three Core Components

### 1. Plugin

The [**Vite Plugin**](/fundamentals/plugin/) is the engine that powers everything. It:

- Scans your `src/routes/**/+server.ts` files
- Analyzes code using TypeScript AST to infer schemas
- Generates a virtual module with OpenAPI paths
- Transforms handlers to inject validation wrappers
- Syncs types to `.svelte-kit/types`

**Configure it in:** `vite.config.ts`

```typescript
import svelteOpenApi from 'sveltekit-auto-openapi/plugin';

export default defineConfig({
  plugins: [
    sveltekit(),
    svelteOpenApi({
      showDebugLogs: false,
      skipAutoValidation: false,
      // ... more options
    }),
  ],
});
```

[Learn more about Plugin Configuration →](/fundamentals/plugin/)

### 2. RouteConfig

The [**RouteConfig**](/fundamentals/route-config/) is how you configure individual routes. Export a `_config` object from your `+server.ts` file to:

- Define OpenAPI schemas (request body, responses, parameters)
- Enable runtime validation
- Add descriptions and metadata
- Control validation behavior

**Use it in:** `src/routes/api/**/+server.ts`

```typescript
import type { RouteConfig } from 'sveltekit-auto-openapi/types';

export const _config = {
  openapiOverride: {
    POST: {
      summary: 'Create resource',
      requestBody: { /* ... */ },
      responses: { /* ... */ }
    }
  }
} satisfies RouteConfig;
```

[Learn more about Route Configuration →](/fundamentals/route-config/)

### 3. ScalarModule

The [**ScalarModule**](/fundamentals/scalar-module/) serves your OpenAPI documentation with a beautiful interactive UI. It:

- Exposes the OpenAPI JSON schema
- Renders interactive documentation with Scalar
- Supports customization and theming
- Allows merging custom paths

**Use it in:** `src/routes/api-docs/[slug]/+server.ts`

```typescript
import ScalarModule from 'sveltekit-auto-openapi/scalar-module';

export const { GET, _config } = ScalarModule({
  openApiOpts: {
    info: {
      title: 'My API',
      version: '1.0.0'
    }
  }
});
```

[Learn more about Scalar Module →](/fundamentals/scalar-module/)

## How They Work Together

Here's how these components interact during development:

```
┌─────────────────────────────────────────────────────────┐
│ 1. You write a route                                    │
│    src/routes/api/users/+server.ts                      │
│    - export const _config = { ... }                     │
│    - export async function POST({ validated }) { ... }  │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│ 2. Vite Plugin processes during build                   │
│    - Discovers the route file                           │
│    - Extracts _config.openapiOverride                   │
│    - Analyzes AST for unconfigured methods              │
│    - Merges both sources                                │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│ 3. Plugin generates outputs                             │
│    - Creates virtual:sveltekit-auto-openapi/schema-paths│
│    - Wraps handlers with validation middleware          │
│    - Syncs types to .svelte-kit/types                   │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│ 4. ScalarModule serves docs                             │
│    - Imports the virtual module                         │
│    - Combines with openApiOpts metadata                 │
│    - Serves OpenAPI JSON at /api-docs/openapi.json     │
│    - Renders Scalar UI at /api-docs/scalar              │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│ 5. Runtime validation (if configured)                   │
│    - Request arrives at your endpoint                   │
│    - Validation wrapper intercepts                      │
│    - Validates input against schemas                    │
│    - Injects validated data to event.validated          │
│    - Runs your handler                                  │
│    - Validates response before returning                │
└─────────────────────────────────────────────────────────┘
```

## Configuration Levels

You can configure SvelteKit Auto OpenAPI at three levels:

### Global Level (Plugin Config)

Set defaults for all routes in `vite.config.ts`:

```typescript
svelteOpenApi({
  skipValidationDefault: {
    request: { body: false, query: true },  // Skip query validation by default
    response: true  // Skip response validation by default
  },
  returnsDetailedErrorDefault: {
    request: true  // Return detailed errors for requests
  }
})
```

### Route Level (_config)

Override global settings for specific routes:

```typescript
export const _config = {
  openapiOverride: {
    POST: {
      requestBody: {
        $_skipValidation: false,  // Validate even if global default is true
        content: { /* ... */ }
      }
    }
  }
} satisfies RouteConfig;
```

### Field Level (Schema Flags)

Control individual fields within a schema:

```typescript
requestBody: {
  content: {
    'application/json': {
      $_skipValidation: true,  // Skip this specific content type
      schema: { /* ... */ }
    }
  }
}
```

## Data Flow

Understanding how data flows through the system:

### Development Time

```
Your Code → Plugin Analysis → Virtual Module → Type Sync
```

1. You write routes with type annotations
2. Plugin reads and analyzes your code
3. Virtual module is generated with OpenAPI paths
4. Types are synced to SvelteKit's type system

### Runtime

```
Request → Validation → Handler → Response Validation → Client
```

1. HTTP request arrives at your endpoint
2. Validation wrapper checks against schemas
3. Your handler receives validated data
4. Response is validated before sending
5. Client receives response or error

## Next Steps

Now that you understand the fundamentals, dive deeper into each component:

- [**Plugin Configuration**](/fundamentals/plugin/) - Learn all plugin options and how the plugin works internally
- [**Route Configuration**](/fundamentals/route-config/) - Master the `_config` export and OpenAPI schemas
- [**Scalar Module**](/fundamentals/scalar-module/) - Customize your API documentation

Or explore practical guides:

- [**Validation Guide**](/guides/validation/) - Use Zod, TypeBox, and other StandardSchema libraries
- [**Error Handling**](/guides/error-handling/) - Handle validation errors gracefully
- [**Best Practices**](/guides/best-practices/) - Patterns for production-ready APIs
