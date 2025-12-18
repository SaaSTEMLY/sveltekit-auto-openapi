---
title: Virtual Modules
description: Direct access to generated schemas and validation maps
---

# Virtual Modules

The Vite plugin generates two virtual modules that contain all schemas and validation configurations. While most users don't need to import these directly (they're used internally by `ScalarModule` and `SchemaValidationHook`), they're available for advanced use cases.

## What Are Virtual Modules?

Virtual modules are code modules that don't exist as physical files but are generated at build time by the Vite plugin. They're imported like regular modules but contain dynamically generated content.

## Available Virtual Modules

### `virtual:sveltekit-auto-openapi/schema-paths`

Contains the complete OpenAPI paths object with all route schemas.

```ts
import openApiPaths from "virtual:sveltekit-auto-openapi/schema-paths";
```

**Type:** `OpenAPIV3.PathsObject`

**Structure:**

```ts
{
  "/api/users": {
    get: {
      summary: "List users",
      responses: { /* ... */ }
    },
    post: {
      summary: "Create user",
      requestBody: { /* ... */ },
      responses: { /* ... */ }
    }
  },
  "/api/users/{id}": {
    get: {
      parameters: [{ name: "id", in: "path", /* ... */ }],
      responses: { /* ... */ }
    }
  }
}
```

### `virtual:sveltekit-auto-openapi/schema-validation-map`

Contains a registry of validation configurations for each route and method.

```ts
import validationRegistry from "virtual:sveltekit-auto-openapi/schema-validation-map";
```

**Type:** `ValidationRegistryMap`

**Structure:**

```ts
{
  "/api/users": {
    POST: {
      modulePath: "src/routes/api/users/+server.ts",
      hasInput: true,
      hasOutput: true,
      isImplemented: true,
      input: {
        body: { schema: {/* JSON Schema */}, showErrorMessage: true },
        query: { schema: {/* JSON Schema */} },
        parameters: { schema: {/* JSON Schema */} },
        headers: { schema: {/* JSON Schema */} },
        cookies: { schema: {/* JSON Schema */} }
      },
      output: {
        "200": {
          body: { schema: {/* JSON Schema */} },
          headers: { schema: {/* JSON Schema */} },
          cookies: { schema: {/* JSON Schema */} }
        }
      }
    }
  }
}
```

## Virtual Module Generation Flow

```
+server.ts Files
      │
      ▼
  Vite Plugin
      │
      ▼
  AST Parser
      │
      ▼
Extract Types & _config
      │
      ▼
Generate OpenAPI Schemas
      │
      ▼
Create Virtual Modules
      │
      ├──────────────────┐
      │                  │
      ▼                  ▼
schema-paths       schema-validation-map
  Module                 Module
      │                  │
      ▼                  ▼
ScalarModule      SchemaValidationHook
   Import               Import
```

## When to Use Virtual Modules

Most users never need to import these directly. They're used internally by:

- **ScalarModule** - Imports `schema-paths` to serve OpenAPI JSON
- **SchemaValidationHook** - Imports `schema-validation-map` for runtime validation

### Use Cases for Direct Import

You might want to import these directly when:

1. **Custom Documentation Server** - Building your own docs UI instead of using Scalar
2. **Schema Export** - Exporting schemas for other tools
3. **Custom Validation Logic** - Implementing custom validation beyond the built-in hook
4. **Schema Analysis** - Analyzing generated schemas programmatically
5. **Testing** - Validating that schemas are generated correctly

## Example: Custom Documentation Server

```ts
// src/routes/api/custom-docs/+server.ts
import openApiPaths from "virtual:sveltekit-auto-openapi/schema-paths";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async () => {
  const openApiDocument = {
    openapi: "3.0.0",
    info: {
      title: "My Custom API Docs",
      version: "1.0.0",
    },
    paths: openApiPaths,
  };

  return json(openApiDocument);
};
```

## Example: Schema Export for Testing

```ts
// scripts/export-schemas.ts
import openApiPaths from "virtual:sveltekit-auto-openapi/schema-paths";
import { writeFileSync } from "fs";

// Export schemas to file for external tools
const schemas = JSON.stringify(openApiPaths, null, 2);
writeFileSync("openapi-paths.json", schemas);

console.log("Schemas exported to openapi-paths.json");
```

## Example: Custom Validation

```ts
// src/hooks.server.ts
import validationRegistry from "virtual:sveltekit-auto-openapi/schema-validation-map";
import { Validator } from "@cfworker/json-schema";
import type { Handle } from "@sveltejs/kit";

export const handle: Handle = async ({ event, resolve }) => {
  const routeId = event.route.id;
  const method = event.request.method;

  const config = validationRegistry[routeId]?.[method];

  if (config?.input?.body) {
    const body = await event.request.json();
    const validator = new Validator(config.input.body.schema);
    const result = validator.validate(body);

    if (!result.valid) {
      // Custom error handling
      return new Response(
        JSON.stringify({ error: "Custom validation failed", errors: result.errors }),
        { status: 400 }
      );
    }
  }

  return resolve(event);
};
```

## TypeScript Support

Virtual modules have full TypeScript support. Your IDE will provide autocomplete and type checking:

```ts
import openApiPaths from "virtual:sveltekit-auto-openapi/schema-paths";
// openApiPaths is typed as OpenAPIV3.PathsObject

import validationRegistry from "virtual:sveltekit-auto-openapi/schema-validation-map";
// validationRegistry is typed as ValidationRegistryMap
```

## Module Generation Timing

### Development Mode
- Virtual modules are regenerated when `+server.ts` files change
- Updates are instant thanks to HMR (Hot Module Replacement)
- No server restart required

### Production Build
- Virtual modules are generated once during `vite build`
- Bundled into your production build
- No runtime generation overhead

## Debugging Virtual Modules

### View Generated Content

You can inspect generated virtual module content during development:

```ts
import openApiPaths from "virtual:sveltekit-auto-openapi/schema-paths";

console.log("Generated paths:", JSON.stringify(openApiPaths, null, 2));
```

### Enable Debug Logging

Set the `DEBUG_OPENAPI` environment variable:

```bash
DEBUG_OPENAPI=true bun run dev
```

This logs detailed information about schema generation in the terminal.

## Caching and Performance

The plugin implements caching to avoid redundant generation:

- Schemas are cached based on file content
- Only changed files trigger regeneration
- Virtual modules are updated efficiently

## Limitations

### During SSR Loading

During Server-Side Rendering (SSR) module loading, the plugin may return cached stubs to prevent deadlocks when route files import virtual modules. This is handled automatically and shouldn't affect your application.

### Module Resolution

Virtual modules are only available in server-side code. Don't try to import them in client-side components:

```ts
// ❌ Don't do this in +page.svelte
import openApiPaths from "virtual:sveltekit-auto-openapi/schema-paths";

// ✅ Do this in +server.ts or hooks.server.ts
import openApiPaths from "virtual:sveltekit-auto-openapi/schema-paths";
```

## Best Practices

1. **Use Built-in Modules First** - Prefer `ScalarModule` and `SchemaValidationHook` over direct imports
2. **Server-Side Only** - Only import virtual modules in server-side code
3. **Type Safety** - Leverage TypeScript types for autocomplete and validation
4. **Caching** - Don't repeatedly import in hot paths; cache the reference if needed

## Next Steps

- Learn about the [Schema Validation Hook](/essentials/schema-validation-hook/) that uses these modules
- Explore the [Scalar Module](/essentials/scalar-module/) configuration
- Check [Plugin Configuration](/essentials/plugin-configuration/) for schema generation details
