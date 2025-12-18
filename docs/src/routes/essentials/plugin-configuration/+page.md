---
title: Plugin Configuration
description: Configure the Vite plugin for OpenAPI schema generation
---

# Plugin Configuration

The Vite plugin is the core of SvelteKit Auto OpenAPI. It analyzes your `+server.ts` files and generates OpenAPI schemas and validation maps.

## Basic Setup

Add the plugin to your `vite.config.ts`:

```ts
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";
import svelteOpenApi from "sveltekit-auto-openapi/plugin";

export default defineConfig({
  plugins: [sveltekit(), svelteOpenApi()],
});
```

## How It Works

The plugin operates during both development and build:

1. **AST Analysis** - Parses TypeScript files using `ts-morph` to extract type information
2. **Schema Generation** - Converts TypeScript types to OpenAPI/JSON Schema
3. **Virtual Modules** - Creates two virtual modules with generated schemas
4. **Hot Reload** - Updates schemas automatically when you modify routes

## Configuration Options

Currently, the plugin accepts no configuration parameters. All customization happens through `_config` exports in your route files.

## Virtual Modules

The plugin generates two virtual modules that are used internally:

### `virtual:sveltekit-auto-openapi/schema-paths`

Contains the complete OpenAPI paths object with all route schemas.

```ts
import openApiPaths from "virtual:sveltekit-auto-openapi/schema-paths";
```

### `virtual:sveltekit-auto-openapi/schema-validation-map`

Contains a registry of validation configurations for the validation hook.

```ts
import validationRegistry from "virtual:sveltekit-auto-openapi/schema-validation-map";
```

> Most users don't need to import these directly - they're used by the `ScalarModule` and `SchemaValidationHook`.

## Debug Mode

Enable debug logging by setting the `DEBUG_OPENAPI` environment variable:

```bash
DEBUG_OPENAPI=true bun run dev
```

This will log detailed information about schema generation.

## Hot Reload Behavior

During development, the plugin watches your `+server.ts` files:

- **File changes** trigger automatic schema regeneration
- **Virtual modules** are updated immediately
- **No server restart** required

## Build-Time vs Dev-Time

### Development Mode
- Schemas regenerate on file changes
- Debug logging available
- Source maps enabled

### Production Build
- Schemas generated once during build
- Optimized for performance
- No runtime schema generation

## TypeScript Support

The plugin automatically adds type declarations for virtual modules. Your IDE should provide autocomplete for:

```ts
import openApiPaths from "virtual:sveltekit-auto-openapi/schema-paths";
import validationRegistry from "virtual:sveltekit-auto-openapi/schema-validation-map";
```

## Next Steps

- Learn about [Schema Validation Hook](/essentials/schema-validation-hook/) to enable runtime validation
- Explore [Scalar Module](/essentials/scalar-module/) to serve API documentation
- See how schemas are inferred in [Automatic AST Inference](/essentials/usage-in-server-routes/automatic-ast-inference/)
