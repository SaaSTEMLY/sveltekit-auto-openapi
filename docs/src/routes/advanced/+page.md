---
title: Advanced Features Overview
description: Deep dive into SvelteKit Auto OpenAPI internals
---

# Advanced Features

This section covers advanced topics and internals of SvelteKit Auto OpenAPI. These features are for developers who want to understand how the plugin works under the hood or extend its functionality.

## When You Need Advanced Features

You typically don't need these features for normal usage. Consider exploring advanced topics when you:

- Want to programmatically access generated schemas
- Need to understand type synchronization internals
- Are debugging validation issues
- Want to extend or customize the plugin
- Are contributing to the project
- Need fine-grained control over the build process

## Feature Index

### [Virtual Modules](/advanced/virtual-modules/)

**What**: Vite virtual modules that expose generated OpenAPI schemas

**When to use**:
- Access schemas programmatically in your code
- Build custom documentation tools
- Implement schema introspection
- Test generated schemas
- Create custom API clients

**Key concept**: The plugin generates a virtual module `virtual:sveltekit-auto-openapi/schema-paths` that you can import like any regular module.

### [Sync Helper](/advanced/sync-helper/)

**What**: Type synchronization system that injects helpers into SvelteKit's type system

**When to use**:
- Understanding how types are generated
- Debugging type issues
- Customizing type generation
- Contributing type system improvements

**Key concept**: The sync helper modifies `.svelte-kit/types` files to augment RequestEvent with `validated`, `json()`, and `error()` helpers.

### [Validation Wrapper](/advanced/validation-wrapper/)

**What**: Runtime validation middleware that wraps route handlers

**When to use**:
- Understanding validation performance
- Debugging validation failures
- Implementing custom validation logic
- Optimizing validation for production

**Key concept**: The plugin transforms your handlers to wrap them with validation middleware that validates inputs before execution and outputs after.

### [Type System](/advanced/type-system/)

**What**: TypeScript type utilities for extracting types from schemas

**When to use**:
- Building type-safe APIs
- Creating custom type utilities
- Understanding type inference
- Working with complex schemas

**Key concept**: The type system provides utilities like `ExtractSchemaType`, `ExtractValidatedInputs`, and `InjectedHelpers` for deep TypeScript integration.

## How They Work Together

```
┌─────────────────────────────────────────────────────────┐
│ Your Code: +server.ts with _config export              │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│ Plugin analyzes routes and generates schemas            │
└─────────────────────────────────────────────────────────┘
                          │
                ┌─────────┴─────────┐
                │                   │
                ▼                   ▼
┌────────────────────────┐  ┌──────────────────────────┐
│ Virtual Module         │  │ Validation Wrapper       │
│ - Exposes schemas      │  │ - Wraps handlers         │
│ - Used by ScalarModule │  │ - Validates I/O          │
└────────────────────────┘  └──────────────────────────┘
                │                   │
                ▼                   ▼
┌────────────────────────┐  ┌──────────────────────────┐
│ Sync Helper            │  │ Type System              │
│ - Injects types        │  │ - Type utilities         │
│ - Updates $types.d.ts  │  │ - Type extraction        │
└────────────────────────┘  └──────────────────────────┘
                │                   │
                └─────────┬─────────┘
                          ▼
┌─────────────────────────────────────────────────────────┐
│ Runtime: Typed, validated, documented API routes        │
└─────────────────────────────────────────────────────────┘
```

## Prerequisites

Before diving into advanced topics, you should:

- Be comfortable with SvelteKit fundamentals
- Understand TypeScript generics and type inference
- Know how Vite plugins work (helpful but not required)
- Have read the [Fundamentals](/fundamentals/) section

## Common Advanced Use Cases

### Custom Documentation Generation

Use virtual modules to build custom docs:

```typescript
import schemaPaths from 'virtual:sveltekit-auto-openapi/schema-paths';

// Generate custom markdown docs
export function generateMarkdownDocs() {
  let markdown = '# API Documentation\n\n';

  for (const [path, methods] of Object.entries(schemaPaths)) {
    markdown += `## ${path}\n\n`;

    for (const [method, operation] of Object.entries(methods)) {
      markdown += `### ${method}\n`;
      markdown += `${operation.summary}\n\n`;
    }
  }

  return markdown;
}
```

### Schema Testing

Test generated schemas programmatically:

```typescript
import { describe, test, expect } from 'bun:test';
import schemaPaths from 'virtual:sveltekit-auto-openapi/schema-paths';

describe('API Schemas', () => {
  test('all endpoints have summaries', () => {
    for (const [path, methods] of Object.entries(schemaPaths)) {
      for (const [method, operation] of Object.entries(methods)) {
        expect(operation.summary).toBeDefined();
      }
    }
  });
});
```

### Custom Validation Logic

Extend validation wrapper behavior:

```typescript
import { validationWrapper } from 'sveltekit-auto-openapi/validation-wrapper';

// Custom wrapper with additional logic
export function customValidationWrapper(config, method, handler) {
  return async (event) => {
    // Pre-validation hook
    console.log('Request received:', event.url.pathname);

    // Run standard validation
    const wrappedHandler = await validationWrapper(config, method, handler);
    const response = await wrappedHandler(event);

    // Post-validation hook
    console.log('Response sent:', response.status);

    return response;
  };
}
```

### Type-Safe API Client

Generate a type-safe client from schemas:

```typescript
import type { RouteConfig } from 'sveltekit-auto-openapi/types';
import type { ExtractValidatedInputsForMethod, ExtractSuccessResponseTypeForMethod } from 'sveltekit-auto-openapi/types';

type UserRouteConfig = typeof import('./routes/api/users/+server')._config;

type CreateUserInput = ExtractValidatedInputsForMethod<UserRouteConfig, 'POST'>['body'];
type CreateUserResponse = ExtractSuccessResponseTypeForMethod<UserRouteConfig, 'POST'>;

// Type-safe API client
async function createUser(data: CreateUserInput): Promise<CreateUserResponse> {
  const response = await fetch('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  return response.json();
}
```

## Performance Implications

Understanding internals helps optimize performance:

### Virtual Module

- **Cost**: Generated once per build, cached
- **Impact**: Minimal - only loaded when imported
- **Optimization**: Tree-shaken if unused

### Validation Wrapper

- **Cost**: Validation runs on every request
- **Impact**: 1-5ms overhead per request
- **Optimization**: Skip validation in production via `skipValidationDefault`

### Type Sync

- **Cost**: Runs during `svelte-kit sync`
- **Impact**: None at runtime - build-time only
- **Optimization**: Only syncs changed files

### Type System

- **Cost**: TypeScript compile-time only
- **Impact**: Zero runtime cost
- **Optimization**: Types are erased at runtime

## Debugging Advanced Features

### Enable Debug Logs

See what the plugin is doing:

```typescript
svelteOpenApi({
  showDebugLogs: true
})
```

### Inspect Virtual Module

Check generated schemas:

```typescript
import schemaPaths from 'virtual:sveltekit-auto-openapi/schema-paths';
console.log(JSON.stringify(schemaPaths, null, 2));
```

### Check Type Sync

Verify types were injected:

```bash
cat .svelte-kit/types/src/routes/api/users/\$types.d.ts | grep "InjectedHelpers"
```

### Test Validation

Write tests for validation logic:

```typescript
import { validationWrapper } from 'sveltekit-auto-openapi/validation-wrapper';

test('validates request body', async () => {
  const config = { /* ... */ };
  const handler = vi.fn();

  const wrapped = await validationWrapper(config, 'POST', handler);

  // Test with invalid data
  await expect(wrapped({
    request: { json: () => ({ invalid: 'data' }) }
  })).rejects.toThrow();
});
```

## Next Steps

Dive into specific advanced topics:

- [**Virtual Modules**](/advanced/virtual-modules/) - Access generated schemas programmatically
- [**Sync Helper**](/advanced/sync-helper/) - Understand type synchronization
- [**Validation Wrapper**](/advanced/validation-wrapper/) - Learn how validation works
- [**Type System**](/advanced/type-system/) - Master TypeScript integration

Or return to practical guides:

- [**Validation Guide**](/guides/validation/) - Using validation schemas
- [**Best Practices**](/guides/best-practices/) - Production-ready patterns
