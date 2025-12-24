---
title: Best Practices
description: Patterns and practices for production-ready APIs
---

# Best Practices

This guide covers recommended patterns for building production-ready APIs with SvelteKit Auto OpenAPI.

## Route Organization

### RESTful Structure

Organize routes following REST conventions:

```
src/routes/api/
├── users/
│   ├── +server.ts                 # GET /api/users, POST /api/users
│   └── [id]/
│       ├── +server.ts             # GET /api/users/[id], PUT /api/users/[id], DELETE /api/users/[id]
│       └── posts/
│           └── +server.ts         # GET /api/users/[id]/posts
├── posts/
│   ├── +server.ts                 # GET /api/posts, POST /api/posts
│   └── [id]/
│       ├── +server.ts             # GET /api/posts/[id], PUT /api/posts/[id]
│       └── comments/
│           └── +server.ts         # GET /api/posts/[id]/comments
└── auth/
    ├── login/
    │   └── +server.ts             # POST /api/auth/login
    └── logout/
        └── +server.ts             # POST /api/auth/logout
```

### Versioning

Version your API routes for backwards compatibility:

```
src/routes/api/
├── v1/
│   ├── users/
│   │   └── +server.ts
│   └── posts/
│       └── +server.ts
└── v2/
    ├── users/
    │   └── +server.ts
    └── posts/
        └── +server.ts
```

Serve separate docs for each version:

```typescript
// src/routes/api/v1/docs/[slug]/+server.ts
export const { GET, _config } = ScalarModule({
  openApiOpts: {
    info: { title: 'API v1', version: '1.0.0' }
  }
});

// src/routes/api/v2/docs/[slug]/+server.ts
export const { GET, _config } = ScalarModule({
  openApiOpts: {
    info: { title: 'API v2', version: '2.0.0' }
  }
});
```

### Group by Feature

For larger APIs, group by feature domain:

```
src/routes/api/
├── auth/
│   ├── login/+server.ts
│   ├── register/+server.ts
│   └── refresh/+server.ts
├── billing/
│   ├── invoices/+server.ts
│   ├── payment-methods/+server.ts
│   └── subscriptions/+server.ts
└── analytics/
    ├── events/+server.ts
    └── reports/+server.ts
```

## Schema Reusability

### Shared Schema Library

Create a centralized schema library:

```typescript
// src/lib/schemas/common.ts
export const IdSchema = {
  type: 'string',
  pattern: '^[0-9]+$'
} as const;

export const TimestampSchema = {
  type: 'string',
  format: 'date-time'
} as const;

export const PaginationSchema = {
  type: 'object',
  properties: {
    page: { type: 'number', minimum: 1, default: 1 },
    limit: { type: 'number', minimum: 1, maximum: 100, default: 20 },
    total: { type: 'number' },
    pages: { type: 'number' }
  }
} as const;

export const ErrorSchema = {
  type: 'object',
  properties: {
    error: { type: 'string' },
    code: { type: 'string' },
    details: { type: 'object' }
  },
  required: ['error', 'code']
} as const;
```

### Resource Schemas

Define schemas for domain entities:

```typescript
// src/lib/schemas/user.ts
export const UserSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    email: { type: 'string', format: 'email' },
    name: { type: 'string' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' }
  },
  required: ['id', 'email', 'name']
} as const;

export const CreateUserSchema = {
  type: 'object',
  properties: {
    email: { type: 'string', format: 'email' },
    name: { type: 'string', minLength: 1 },
    password: { type: 'string', minLength: 8 }
  },
  required: ['email', 'name', 'password']
} as const;

export const UpdateUserSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1 },
    email: { type: 'string', format: 'email' }
  }
} as const;
```

### Composition

Compose complex schemas from simpler ones:

```typescript
// src/lib/schemas/post.ts
import { UserSchema } from './user';
import { TimestampSchema } from './common';

export const PostSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    title: { type: 'string' },
    content: { type: 'string' },
    author: UserSchema,  // Reuse user schema
    createdAt: TimestampSchema,
    updatedAt: TimestampSchema
  }
} as const;
```

With Zod:

```typescript
import { z } from 'zod';

const TimestampSchema = z.string().datetime();
const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string()
});

const PostSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  author: UserSchema,  // Compose
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema
});
```

## Validation Strategy

### What to Validate

**Always validate:**
- User input (body, query, headers)
- External data (API responses, webhooks)
- Path parameters
- Authentication tokens

**Consider skipping:**
- Internal service-to-service calls
- Responses in production (performance)
- Trusted middleware data

### Where to Validate

```typescript
// vite.config.ts - Global defaults
svelteOpenApi({
  skipValidationDefault: {
    request: {
      headers: false,     // Validate headers (auth tokens)
      query: false,       // Validate query params
      pathParams: false,  // Validate path params
      body: false,        // Validate body
      cookies: true       // Skip cookies (middleware handles)
    },
    response: true  // Skip in production
  }
})
```

### Validation Depth

Balance thoroughness with performance:

```typescript
// ✅ Good - validate what matters
const CreateUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
  name: z.string().min(1).max(255)
});

// ❌ Too strict - unnecessary constraints
const OverValidatedSchema = z.object({
  email: z.string().email().regex(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/),
  password: z.string().min(8).max(100).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/),
  name: z.string().min(1).max(255).regex(/^[a-zA-Z\s]+$/)
});
```

## Documentation Quality

### Write Clear Summaries

Use verb + noun format:

```typescript
POST: {
  summary: 'Create user',           // ✅ Clear action
  description: 'Creates a new user account with email and password',
}

// Not: "User creation endpoint"  ❌ Vague
// Not: "Creates a user"          ❌ Redundant with summary
```

### Add Descriptions

Provide context and usage details:

```typescript
POST: {
  summary: 'Create user',
  description: `
Creates a new user account.

The email must be unique. Password must be at least 8 characters.

A verification email will be sent to the provided address.

Returns the created user with an auto-generated ID.
  `,
  requestBody: {
    description: 'User registration data',
    // ...
  }
}
```

### Use Tags

Organize endpoints with tags:

```typescript
// In ScalarModule
openApiOpts: {
  tags: [
    { name: 'users', description: 'User management endpoints' },
    { name: 'auth', description: 'Authentication endpoints' },
    { name: 'posts', description: 'Blog post endpoints' }
  ]
}

// In routes
POST: {
  tags: ['users', 'auth'],
  summary: 'Register user',
  // ...
}
```

### Document Examples

Provide example values:

```typescript
schema: {
  type: 'object',
  properties: {
    email: {
      type: 'string',
      format: 'email',
      example: 'user@example.com'
    },
    age: {
      type: 'number',
      minimum: 18,
      example: 25
    }
  }
}
```

With Zod:

```typescript
z.object({
  email: z.string().email().describe('User email address').openapi({ example: 'user@example.com' }),
  age: z.number().min(18).describe('User age').openapi({ example: 25 })
})
```

## Performance Considerations

### Skip Response Validation in Production

Response validation has overhead:

```typescript
const isProd = import.meta.env.PROD;

svelteOpenApi({
  skipValidationDefault: {
    response: isProd  // Skip in production only
  }
})
```

### Use Efficient Schemas

Avoid overly complex validation:

```typescript
// ✅ Simple and fast
schema: {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' }
  }
}

// ❌ Complex and slow
schema: {
  type: 'object',
  properties: {
    id: { type: 'string', pattern: '^[a-f0-9]{24}$' },
    name: {
      type: 'string',
      pattern: '^[A-Z][a-zA-Z]{1,50}$',
      minLength: 2,
      maxLength: 50
    },
    tags: {
      type: 'array',
      items: { type: 'string', pattern: '^[a-z-]+$' },
      uniqueItems: true
    }
  }
}
```

### Lazy Load Schemas

For rarely-used endpoints, consider lazy loading:

```typescript
// Only import when needed
export async function POST({ request }) {
  const { PostSchema } = await import('$lib/schemas/post');
  // Validate and process
}
```

### Cache Validation Results

For repeated validations:

```typescript
const schemaCache = new Map();

function getValidator(schema) {
  const key = JSON.stringify(schema);
  if (!schemaCache.has(key)) {
    schemaCache.set(key, new Validator(schema));
  }
  return schemaCache.get(key);
}
```

## Security

### Validate All User Input

Never trust client data:

```typescript
// ✅ Validate everything
export const _config = {
  openapiOverride: {
    POST: {
      requestBody: {
        $headers: { schema: HeadersSchema },
        $query: { schema: QuerySchema },
        $pathParams: { schema: ParamsSchema },
        content: { 'application/json': { schema: BodySchema } }
      }
    }
  }
} satisfies RouteConfig;
```

### Sanitize Output

Don't expose sensitive data:

```typescript
// ❌ Exposes password hash
return json({
  id: user.id,
  email: user.email,
  passwordHash: user.passwordHash  // Don't do this!
});

// ✅ Only public fields
return json({
  id: user.id,
  email: user.email,
  name: user.name
});
```

### Rate Limiting

Add rate limiting to protect endpoints:

```typescript
// src/hooks.server.ts
import { rateLimit } from '$lib/rateLimit';

export async function handle({ event, resolve }) {
  if (event.url.pathname.startsWith('/api/')) {
    const limited = await rateLimit(event.getClientAddress());
    if (limited) {
      return new Response('Too many requests', { status: 429 });
    }
  }

  return resolve(event);
}
```

### Validate File Uploads

For file upload endpoints:

```typescript
export async function POST({ request, error }) {
  const formData = await request.formData();
  const file = formData.get('file');

  if (!(file instanceof File)) {
    error(400, { error: 'File required' });
  }

  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    error(400, { error: 'Invalid file type' });
  }

  // Validate file size (5MB max)
  if (file.size > 5 * 1024 * 1024) {
    error(400, { error: 'File too large' });
  }

  // Process file...
}
```

### Use HTTPS

Always use HTTPS in production:

```typescript
// In ScalarModule
openApiOpts: {
  servers: [
    {
      url: 'https://api.example.com',  // ✅ HTTPS
      description: 'Production'
    }
  ]
}
```

## Testing

### Test Validation

Write tests for schema validation:

```typescript
import { describe, test, expect } from 'bun:test';
import { POST } from './+server';

describe('POST /api/users', () => {
  test('accepts valid input', async () => {
    const event = createEvent({
      body: { email: 'test@example.com', password: 'secure123' }
    });

    const response = await POST(event);
    expect(response.status).toBe(201);
  });

  test('rejects invalid email', async () => {
    const event = createEvent({
      body: { email: 'invalid', password: 'secure123' }
    });

    const response = await POST(event);
    expect(response.status).toBe(400);
  });

  test('rejects short password', async () => {
    const event = createEvent({
      body: { email: 'test@example.com', password: 'short' }
    });

    const response = await POST(event);
    expect(response.status).toBe(400);
  });
});
```

### Test OpenAPI Schema

Validate generated OpenAPI schema:

```typescript
import { describe, test, expect } from 'bun:test';
import schemaPaths from 'virtual:sveltekit-auto-openapi/schema-paths';

describe('OpenAPI Schema', () => {
  test('includes all endpoints', () => {
    expect(schemaPaths['/api/users']).toBeDefined();
    expect(schemaPaths['/api/users'].POST).toBeDefined();
  });

  test('has required properties', () => {
    const operation = schemaPaths['/api/users'].POST;
    expect(operation.summary).toBeDefined();
    expect(operation.requestBody).toBeDefined();
    expect(operation.responses['201']).toBeDefined();
  });
});
```

## Environment Configuration

### Development vs Production

Use different settings per environment:

```typescript
// vite.config.ts
const isDev = process.env.NODE_ENV === 'development';

export default defineConfig({
  plugins: [
    sveltekit(),
    svelteOpenApi({
      showDebugLogs: isDev,
      returnsDetailedErrorDefault: {
        request: isDev,  // Detailed in dev
        response: false
      },
      skipValidationDefault: {
        response: !isDev  // Skip response validation in prod
      }
    })
  ]
});
```

### Environment Variables

Use env vars for configuration:

```typescript
// .env
API_RATE_LIMIT=100
API_VERSION=v1

// .env.production
API_RATE_LIMIT=1000
API_VERSION=v2
```

Access in code:

```typescript
const rateLimit = parseInt(import.meta.env.API_RATE_LIMIT || '100');
const version = import.meta.env.API_VERSION || 'v1';
```

## Monitoring

### Log Validation Failures

Track validation errors:

```typescript
export async function POST({ validated, json, error }) {
  try {
    const result = await createUser(validated.body);
    return json(result);
  } catch (err) {
    // Log for monitoring
    console.error('User creation failed:', {
      error: err.message,
      input: validated.body,
      timestamp: new Date().toISOString()
    });

    error(500, { error: 'Internal server error' });
  }
}
```

### Track Response Times

Monitor performance:

```typescript
export async function GET({ json }) {
  const start = Date.now();

  try {
    const users = await fetchUsers();
    return json(users);
  } finally {
    const duration = Date.now() - start;
    console.log(`GET /api/users took ${duration}ms`);
  }
}
```

## Related Documentation

- [Validation Guide](/guides/validation/) - Schema validation patterns
- [Error Handling](/guides/error-handling/) - Error response patterns
- [Plugin Configuration](/fundamentals/plugin/) - Plugin options
- [Route Configuration](/fundamentals/route-config/) - Route-level configuration
