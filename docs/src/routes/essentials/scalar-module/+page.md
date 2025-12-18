---
title: Scalar Module
description: Serve OpenAPI schemas and interactive documentation
---

# Scalar Module

The Scalar module serves your OpenAPI schema as JSON and provides beautiful interactive API documentation powered by [Scalar](https://scalar.com).

## Basic Setup

Create a route at `src/routes/api-docs/[slug]/+server.ts`:

```ts
import ScalarModule from "sveltekit-auto-openapi/scalar-module";

export const { GET, _config } = ScalarModule({
  openApiOpts: {
    openapi: "3.0.0",
    info: {
      title: "My App API",
      version: "1.0.0",
    },
  },
});
```

This creates two endpoints:
- `/api-docs/openapi.json` - OpenAPI schema
- `/api-docs/scalar` - Interactive documentation UI

## Configuration Options

### Basic OpenAPI Configuration

Configure your OpenAPI document metadata:

```ts
ScalarModule({
  openApiOpts: {
    openapi: "3.0.0",
    info: {
      title: "My App API",
      version: "1.0.0",
      description: "API documentation for My App",
      contact: {
        name: "API Support",
        email: "support@example.com",
      },
    },
    servers: [
      {
        url: "https://api.example.com",
        description: "Production",
      },
      {
        url: "http://localhost:5173",
        description: "Development",
      },
    ],
  },
});
```

### Schema Endpoint Options

Control the OpenAPI JSON endpoint:

```ts
ScalarModule({
  disableOpenApi: false,              // Disable OpenAPI endpoint
  openApiPath: "openapi.json",        // Custom path (default: "openapi.json")
  showDetailedDocsSchema: false,      // Include full schema in response
  skipDocsValidation: false,          // Skip runtime schema validation
  openApiOpts: { /* ... */ },
});
```

### Documentation UI Options

Control the Scalar documentation interface:

```ts
ScalarModule({
  disableScalar: false,               // Disable Scalar UI
  scalarDocPath: "scalar",            // Custom path (default: "scalar")
  scalarOpts: {
    theme: "purple",                  // Scalar theme
    layout: "modern",                 // Layout style
  },
  openApiOpts: { /* ... */ },
});
```

### Override Paths

Completely override the generated paths:

```ts
ScalarModule({
  overridePaths: {
    "/api/custom": {
      get: {
        summary: "Custom endpoint",
        responses: { /* ... */ },
      },
    },
  },
  openApiOpts: { /* ... */ },
});
```

## Endpoints

### OpenAPI JSON Schema

**URL:** `/api-docs/openapi.json`

Returns the complete OpenAPI schema in JSON format.

Example response:

```js
{
  "openapi": "3.0.0",
  "info": { "title": "My App API", "version": "1.0.0" },
  "paths": {
    "/api/users": { /* ... */ }
  }
}
```

### Scalar Documentation UI

**URL:** `/api-docs/scalar`

Serves an interactive API documentation interface where you can:
- Browse all endpoints
- View request/response schemas
- Try out API calls directly
- See examples and descriptions

## Customization

### Custom Branding

Customize the documentation appearance:

```ts
ScalarModule({
  scalarOpts: {
    theme: "purple",
    customCss: `
      .scalar-app {
        --scalar-color-1: #ff9e64;
      }
    `,
  },
  openApiOpts: { /* ... */ },
});
```

### Custom Servers

Define multiple API servers:

```ts
ScalarModule({
  openApiOpts: {
    openapi: "3.0.0",
    info: { /* ... */ },
    servers: [
      { url: "https://api.example.com", description: "Production" },
      { url: "https://staging-api.example.com", description: "Staging" },
      { url: "http://localhost:5173", description: "Local" },
    ],
  },
});
```

### Security Schemes

Add authentication documentation:

```ts
ScalarModule({
  openApiOpts: {
    openapi: "3.0.0",
    info: { /* ... */ },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
        apiKey: {
          type: "apiKey",
          in: "header",
          name: "X-API-Key",
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
});
```

## Route Structure

The `[slug]` parameter distinguishes between endpoints:

- `slug === "openapi.json"` → Serves OpenAPI schema
- `slug === "scalar"` → Serves Scalar UI
- Other values → 404

## Disabling Endpoints

### Disable OpenAPI JSON

```ts
ScalarModule({
  disableOpenApi: true,
  openApiOpts: { /* ... */ },
});
```

Now only `/api-docs/scalar` works.

### Disable Scalar UI

```ts
ScalarModule({
  disableScalar: true,
  openApiOpts: { /* ... */ },
});
```

Now only `/api-docs/openapi.json` works.

### Custom Paths

```ts
ScalarModule({
  openApiPath: "schema.json",      // /api-docs/schema.json
  scalarDocPath: "docs",           // /api-docs/docs
  openApiOpts: { /* ... */ },
});
```

## Next Steps

- Learn about [Automatic AST Inference](/essentials/usage-in-server-routes/automatic-ast-inference/) to understand how schemas are generated
- Explore [Advanced RouteConfig](/essentials/usage-in-server-routes/advanced-route-config/) to customize route documentation
- See [Virtual Modules](/advanced/virtual-modules/) for advanced schema access
