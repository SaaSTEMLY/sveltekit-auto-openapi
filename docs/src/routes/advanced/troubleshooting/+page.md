---
title: Troubleshooting
description: Common issues and solutions
---

# Troubleshooting

Common issues and their solutions when using SvelteKit Auto OpenAPI.

## Virtual Module Not Found

**Error:** `Cannot find module 'virtual:sveltekit-auto-openapi/schema-paths'`

**Solution:** Ensure the Vite plugin is properly configured in `vite.config.ts`:

```ts
import svelteOpenApi from "sveltekit-auto-openapi/plugin";

export default defineConfig({
  plugins: [sveltekit(), svelteOpenApi()],
});
```

## Validation Not Working

**Problem:** Requests aren't being validated

**Solutions:**

1. Check that the validation hook is configured in `src/hooks.server.ts`
2. Ensure you have `_config` exports in your route files
3. Verify that `$skipValidation` isn't set to `true`

## Hot Reload Not Triggering

**Problem:** Schema changes don't update automatically

**Solutions:**

1. Restart the development server
2. Check that you're modifying `+server.ts` files
3. Enable debug mode: `DEBUG_OPENAPI=true bun run dev`

## Build Failures

**Problem:** Build fails during `vite build`

**Solutions:**

1. Check for TypeScript errors in your route files
2. Ensure all `_config` exports are valid
3. Review build logs for specific error messages

## Type Errors

**Problem:** TypeScript errors in route handlers

**Solutions:**

1. Ensure you're using `satisfies RouteConfig` on your `_config`
2. Import types from the correct module: `sveltekit-auto-openapi/scalar-module`
3. Update your TypeScript configuration to recognize virtual modules

## AST Inference Failures

**Problem:** Schemas aren't being generated automatically

**Solutions:**

1. Use supported patterns: `request.json<Type>()` or type annotations
2. Ensure types are inline or imported
3. Check that complex types are supported (unions/conditionals may not work)

## Debug Mode

Enable detailed logging to diagnose issues:

```bash
DEBUG_OPENAPI=true bun run dev
```

## Get Help

If you're still stuck:

- Open an issue on [GitHub](https://github.com/SaaSTEMLY/sveltekit-auto-openapi/issues)
- Check existing issues for similar problems
- Provide a minimal reproduction if possible

## See Also

- [Plugin Configuration](/essentials/plugin-configuration/) for setup details
- [Schema Validation Hook](/essentials/schema-validation-hook/) for validation configuration
- [Advanced RouteConfig](/essentials/usage-in-server-routes/advanced-route-config/) for usage examples
