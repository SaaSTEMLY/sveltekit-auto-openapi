---
title: Examples
description: See SvelteKit Auto OpenAPI in action
---

# Examples

## Live Demo

Check out our **[live example application](https://www.basic.example.sveltekit-auto-openapi.saastemly.com)** to see SvelteKit Auto OpenAPI in action.

The demo showcases:

- **Automatic inference** - Routes with no `_config` that use AST analysis
- **Runtime validation** - Routes with full validation schemas
- **Interactive documentation** - Browse the generated Scalar API docs
- **All three levels** - Examples of automatic, strict, and raw JSON Schema approaches

## Source Code

Explore the complete source code on GitHub:

**[View examples directory →](https://github.com/SaaSTEMLY/sveltekit-auto-openapi/tree/main/examples/basic)**

The repository includes:

- `src/routes/api/usersBasic/+server.ts` - Level 1: Automatic inference without `_config`
- `src/routes/api/usersOverride/+server.ts` - Level 2/3: Full validation with schemas
- `src/routes/api-docs/[slug]/+server.ts` - ScalarModule documentation setup
- Full SvelteKit application configuration

## What You'll Learn

By exploring the live demo and source code, you'll see:

1. **How AST inference works** - No configuration needed for basic endpoints
2. **How to add validation** - Schemas with StandardSchema or JSON Schema
3. **Type-safe helpers** - Using `validated`, `json()`, and `error()`
4. **Documentation generation** - OpenAPI schemas created automatically
5. **Scalar integration** - Beautiful interactive docs out of the box

## Next Steps

After exploring the examples:

- Read the [Quick Start](/introduction/quick-start/) to add SvelteKit Auto OpenAPI to your project
- Learn about [Route Configuration](/fundamentals/route-config/) to add validation to your routes
- Check out the [Validation Guide](/guides/validation/) to use Zod, TypeBox, or other libraries
- Dive into [Best Practices](/guides/best-practices/) for production-ready APIs
