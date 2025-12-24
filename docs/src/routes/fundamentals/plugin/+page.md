---
title: Plugin Configuration
description: Configure the SvelteKit Auto OpenAPI Vite plugin
---

# Plugin Configuration

The Vite plugin is the core of SvelteKit Auto OpenAPI. It analyzes your routes, generates OpenAPI schemas, and injects validation wrappers.

## Installation

Import and add the plugin to your `vite.config.ts`:

```typescript
// vite.config.ts
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import svelteOpenApi from 'sveltekit-auto-openapi/plugin';

export default defineConfig({
  plugins: [
    sveltekit(),
    svelteOpenApi(),  // ← Add after sveltekit()
  ],
});
```

## Configuration Options

The plugin accepts an optional configuration object:

```typescript
svelteOpenApi({
  showDebugLogs: false,
  skipAutoGenerateSchemaPaths: false,
  skipAutoValidation: false,
  skipValidationDefault: undefined,
  returnsDetailedErrorDefault: undefined,
})
```

### `showDebugLogs`

- **Type:** `boolean`
- **Default:** `false`

Enables detailed console logging for plugin operations. Useful for debugging or understanding what the plugin is doing.

```typescript
svelteOpenApi({
  showDebugLogs: true,
})
```

When enabled, you'll see logs for:
- Routes discovered
- Schemas extracted from AST
- Virtual module generation
- Validation wrapper injection
- Type synchronization

**Use cases:**
- Debugging why a route isn't being detected
- Understanding schema inference
- Troubleshooting validation issues

### `skipAutoGenerateSchemaPaths`

- **Type:** `boolean | { fromAst?: boolean; fromConfig?: boolean }`
- **Default:** `false`

Controls automatic schema generation. Can disable both AST inference and config extraction, or each individually.

**Disable everything:**
```typescript
svelteOpenApi({
  skipAutoGenerateSchemaPaths: true,
})
```

**Disable selectively:**
```typescript
svelteOpenApi({
  skipAutoGenerateSchemaPaths: {
    fromAst: true,      // Skip AST inference, only use _config
    fromConfig: false,  // Still extract from _config exports
  },
})
```

**Use cases:**
- **Skip AST only**: When you want explicit configuration for all routes
- **Skip config only**: When testing AST inference alone
- **Skip both**: When using manual schema definition via `mergePaths` in ScalarModule

### `skipAutoValidation`

- **Type:** `boolean`
- **Default:** `false`

Completely disables runtime validation injection. The plugin will still generate OpenAPI schemas but won't wrap handlers with validation.

```typescript
svelteOpenApi({
  skipAutoValidation: true,
})
```

When enabled:
- No validation wrappers are injected
- `validated`, `json()`, and `error()` helpers are not available
- OpenAPI schemas are still generated for documentation
- Routes behave like standard SvelteKit endpoints

**Use cases:**
- Documentation-only mode
- Performance testing without validation overhead
- Gradual migration (docs first, validation later)

### `skipValidationDefault`

- **Type:** `boolean | { request?: {...} | boolean; response?: {...} | boolean }`
- **Default:** `undefined`

Sets the default `$_skipValidation` flag for all routes. Can be overridden per-route in `_config`.

**Skip all validation:**
```typescript
svelteOpenApi({
  skipValidationDefault: true,
})
```

**Skip requests or responses:**
```typescript
svelteOpenApi({
  skipValidationDefault: {
    request: false,   // Validate requests
    response: true,   // Skip response validation
  },
})
```

**Granular control:**
```typescript
svelteOpenApi({
  skipValidationDefault: {
    request: {
      headers: true,      // Skip header validation
      query: true,        // Skip query validation
      pathParams: false,  // Validate path params
      body: false,        // Validate body
      cookies: true,      // Skip cookie validation
    },
    response: {
      headers: true,  // Skip response header validation
      body: false,    // Validate response body
      cookies: true,  // Skip response cookie validation
    },
  },
})
```

**Use cases:**
- **Skip responses globally**: Most apps don't validate responses in production
- **Skip headers/cookies**: When you trust your middleware to handle these
- **Validate body only**: Most critical validation point

### `returnsDetailedErrorDefault`

- **Type:** `boolean | { request?: {...} | boolean; response?: {...} | boolean }`
- **Default:** `undefined`

Sets the default `$_returnDetailedError` flag for validation errors. Detailed errors include field paths and validation keywords.

**Return detailed errors for everything:**
```typescript
svelteOpenApi({
  returnsDetailedErrorDefault: true,
})
```

**Detailed errors for requests only:**
```typescript
svelteOpenApi({
  returnsDetailedErrorDefault: {
    request: true,   // Detailed request errors
    response: false, // Simple response errors
  },
})
```

**Granular control:**
```typescript
svelteOpenApi({
  returnsDetailedErrorDefault: {
    request: {
      headers: false,     // Simple header errors
      query: true,        // Detailed query errors
      pathParams: false,  // Simple path param errors
      body: true,         // Detailed body errors
      cookies: false,     // Simple cookie errors
    },
    response: false,  // Simple response errors
  },
})
```

**Simple error format:**
```json
{
  "error": "Validation failed"
}
```

**Detailed error format:**
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

**Use cases:**
- **Development**: Detailed errors help debugging
- **Production**: Simple errors avoid exposing schema details
- **Public APIs**: Detailed errors improve developer experience

## How the Plugin Works

Understanding the plugin's internal process helps you use it effectively.

### 1. Discovery Phase

On server start and file changes, the plugin:

1. Scans `src/routes/**/+server.ts` files using glob patterns
2. Reads each file to check for `_config` exports
3. Identifies HTTP methods (GET, POST, PUT, DELETE, etc.)

### 2. Analysis Phase

For each route, the plugin extracts schemas using two approaches:

**A. Config Extraction**

If a `_config` export exists:
- Dynamically imports the route file
- Extracts `_config.openapiOverride`
- Uses these schemas directly

**B. AST Analysis**

For methods without `_config`:
- Parses TypeScript AST using `ts-morph`
- Finds HTTP method functions/constants
- Extracts type annotations from `request.json<Type>()`
- Analyzes `json()` and `error()` calls for response types
- Detects query params from `searchParams.get()` calls
- Infers path parameters from route structure

### 3. Generation Phase

The plugin generates a virtual module:

```typescript
// virtual:sveltekit-auto-openapi/schema-paths
export default {
  "/api/users": {
    "POST": { /* OpenAPI OperationObject */ },
    "GET": { /* OpenAPI OperationObject */ }
  },
  // ... all routes
};
```

This module is:
- Available via import (see [Virtual Modules](/advanced/virtual-modules/))
- Used by ScalarModule to serve documentation
- Cached and invalidated on file changes (HMR support)

### 4. Transformation Phase

For routes with `_config`, the plugin:

1. Wraps the handler function with validation middleware
2. Injects the `validated` property into the request event
3. Provides typed `json()` and `error()` helpers

**Before transformation:**
```typescript
export async function POST({ request }) {
  const data = await request.json();
  return json({ success: true });
}
```

**After transformation:**
```typescript
import { validationWrapper } from 'sveltekit-auto-openapi/validation-wrapper';

const __original_POST = async ({ request }) => {
  const data = await request.json();
  return json({ success: true });
};

export const POST = await validationWrapper(
  _config,
  'POST',
  __original_POST,
  skipValidationDefault,
  returnsDetailedErrorDefault
);
```

### 5. Type Synchronization

The plugin triggers type sync which:

1. Finds routes with `_config` exports
2. Locates corresponding `.svelte-kit/types/src/routes/.../$types.d.ts` files
3. Injects `InjectedHelpers` type augmentations
4. Provides autocomplete for `validated`, `json()`, and `error()`

## Hot Module Replacement

The plugin fully supports HMR during development:

**File change detected:**
```
1. Plugin invalidates virtual module cache
2. Virtual module is regenerated with updated schemas
3. Type sync runs for changed files
4. Browser updates without full reload
```

This means your documentation updates instantly as you modify routes!

## Performance Considerations

### Development

- AST analysis happens once per file on load
- Virtual module is cached until file changes
- Type sync only runs for modified files
- Minimal impact on dev server startup

### Production

- Each route bundles only its own validation code
- No monolithic validation bundle
- Virtual module is tree-shaken if unused
- Zero runtime cost if `skipAutoValidation: true`

## Advanced Configuration

### Documentation-Only Mode

Generate docs without validation:

```typescript
svelteOpenApi({
  skipAutoValidation: true,  // No validation wrappers
})
```

Routes will:
- Generate OpenAPI schemas ✓
- Show up in documentation ✓
- NOT validate requests ✗
- NOT inject helpers ✗

### Explicit-Only Mode

Require `_config` for all routes:

```typescript
svelteOpenApi({
  skipAutoGenerateSchemaPaths: {
    fromAst: true,  // No AST inference
  },
})
```

Routes without `_config`:
- Won't appear in OpenAPI schema
- Won't have validation
- Behave like standard SvelteKit routes

### Development vs Production

Use different settings per environment:

```typescript
import { defineConfig } from 'vite';

const isDev = process.env.NODE_ENV === 'development';

export default defineConfig({
  plugins: [
    sveltekit(),
    svelteOpenApi({
      showDebugLogs: isDev,
      returnsDetailedErrorDefault: {
        request: isDev,  // Detailed errors in dev only
        response: false,
      },
      skipValidationDefault: {
        response: !isDev,  // Skip response validation in production
      },
    }),
  ],
});
```

## Troubleshooting

### Plugin not detecting routes

**Check:**
- Files are named `+server.ts` (not `.js`)
- Files are in `src/routes/` directory
- Enable `showDebugLogs` to see what's discovered

### Virtual module not updating

**Solution:**
- Restart dev server
- Check HMR is working (`vite:hmr` in console)
- Clear `.svelte-kit` directory

### Types not available

**Solution:**
- Run `bunx svelte-kit sync`
- Ensure `generateAutoOpenApiTypes()` is in `svelte.config.js`
- Check `.svelte-kit/types` was generated

### Validation not working

**Check:**
- `_config` is exported from route
- `skipAutoValidation` is not `true`
- Route handler uses injected helpers (`validated`, etc.)

## Related Documentation

- [Route Configuration](/fundamentals/route-config/) - Configure individual routes
- [Virtual Modules](/advanced/virtual-modules/) - Use the generated schemas programmatically
- [Sync Helper](/advanced/sync-helper/) - Understanding type synchronization
- [Validation Wrapper](/advanced/validation-wrapper/) - How validation works internally
