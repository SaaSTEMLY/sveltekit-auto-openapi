---
title: Validation Flags
description: Control validation behavior with flags
---

# Validation Flags

Fine-grained control over validation behavior using flags in your `_config` exports.

## Available Flags

### `$showErrorMessage`

Controls whether detailed validation errors are shown to the client.

```ts
$showErrorMessage: true  // Show detailed errors
$showErrorMessage: false // Show generic errors
```

**Recommended:** `true` in development, `false` in production for security.

### `$skipValidation`

Skip validation for a specific schema while still documenting it.

```ts
$skipValidation: true  // Skip validation
$skipValidation: false // Enable validation (default)
```

## Usage

Apply flags to any validation property:

```ts
export const _config = {
  openapiOverride: {
    POST: {
      $headers: {
        $showErrorMessage: import.meta.env.DEV,
        $skipValidation: false,
        schema: z.object({ ... }).toJSONSchema(),
      },
      requestBody: {
        content: {
          "application/json": {
            $showErrorMessage: true,
            schema: z.object({ ... }).toJSONSchema(),
          },
        },
      },
    },
  },
} satisfies RouteConfig;
```

## See Also

- [Advanced RouteConfig](/essentials/usage-in-server-routes/advanced-route-config/) for usage examples
- [Schema Validation Hook](/essentials/schema-validation-hook/) for how validation works
