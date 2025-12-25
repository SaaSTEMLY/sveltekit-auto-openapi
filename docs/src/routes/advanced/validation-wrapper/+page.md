---
title: Validation Wrapper
description: Runtime validation middleware internals
---

# Validation Wrapper

The Validation Wrapper is the runtime middleware that validates requests and responses. It wraps your route handlers to enforce schema compliance before execution and after.

## What is the Validation Wrapper?

The validation wrapper is a higher-order function that intercepts route handler execution to perform runtime validation using JSON Schema.

**Core function:**

```typescript
async function validationWrapper(
  _config: RouteConfig,
  method: Uppercase<OpenAPIV3.HttpMethods>,
  requestHandler: RequestHandler,
  skipValidationDefault?: ValidationSkipConfig,
  returnsDetailedErrorDefault?: DetailedErrorConfig
): Promise<RequestHandler>;
```

**What it does:**

1. Validates request (headers, cookies, query, params, body)
2. Injects `validated` object into event
3. Provides typed `json()` and `error()` helpers
4. Executes your handler
5. Validates response body and status code
6. Returns response or validation error

## How It Works

### Code Transformation

The plugin transforms your handlers automatically:

**Your code:**

```typescript
export const _config = {
  /* ... */
} satisfies RouteConfig;

export async function POST({ request }) {
  const data = await request.json();
  return json({ success: true });
}
```

**Transformed by plugin:**

```typescript
import { validationWrapper } from "sveltekit-auto-openapi/validation-wrapper";

export const _config = {
  /* ... */
} satisfies RouteConfig;

const __original_POST = async ({ request }) => {
  const data = await request.json();
  return json({ success: true });
};

export const POST = await validationWrapper(
  _config,
  "POST",
  __original_POST,
  skipValidationDefault,
  returnsDetailedErrorDefault
);
```

The transformation:

1. Renames original handler to `__original_POST`
2. Imports `validationWrapper`
3. Wraps handler with validation
4. Exports wrapped version

### Validation Flow

```
┌────────────────────────────────────────┐
│ 1. Request arrives                     │
└────────────────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────┐
│ 2. Validation wrapper intercepts       │
└────────────────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────┐
│ 3. Clone request (preserve body)       │
└────────────────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────┐
│ 4. Validate inputs:                    │
│    - Headers                           │
│    - Cookies                           │
│    - Query parameters                  │
│    - Path parameters                   │
│    - Request body                      │
└────────────────────────────────────────┘
                 │
          ┌──────┴──────┐
          │             │
    Validation      Validation
      fails           passes
          │             │
          ▼             ▼
┌─────────────┐  ┌──────────────────────┐
│ Return 400  │  │ 5. Inject validated  │
│ error       │  │    data into event   │
└─────────────┘  └──────────────────────┘
                          │
                          ▼
                 ┌──────────────────────┐
                 │ 6. Inject helpers    │
                 │    json(), error()   │
                 └──────────────────────┘
                          │
                          ▼
                 ┌──────────────────────┐
                 │ 7. Execute handler   │
                 └──────────────────────┘
                          │
                          ▼
                 ┌──────────────────────┐
                 │ 8. Handler returns   │
                 │    response          │
                 └──────────────────────┘
                          │
                          ▼
                 ┌──────────────────────┐
                 │ 9. Clone response    │
                 │    (preserve body)   │
                 └──────────────────────┘
                          │
                          ▼
                 ┌──────────────────────┐
                 │ 10. Validate:        │
                 │     - Response body  │
                 │     - Status code    │
                 └──────────────────────┘
                          │
                   ┌──────┴──────┐
                   │             │
             Validation      Validation
               fails           passes
                   │             │
                   ▼             ▼
          ┌─────────────┐  ┌──────────────┐
          │ Return 500  │  │ Return       │
          │ error       │  │ response     │
          └─────────────┘  └──────────────┘
```

## Input Validation

### validateInputs()

Validates all request data:

```typescript
async function validateInputs(
  event: RequestEvent,
  methodConfig: OperationObjectWithValidation,
  skipDefaults?: ValidationSkipConfig,
  detailedErrorDefaults?: DetailedErrorConfig
): Promise<ValidatedInputs> {
  const validated: ValidatedInputs = {};

  // Validate headers
  if (methodConfig.requestBody?.$headers) {
    validated.headers = await validateWithSchema(
      extractHeaders(event.request),
      methodConfig.requestBody.$headers.schema,
      "headers"
    );
  }

  // Validate cookies
  if (methodConfig.requestBody?.$cookies) {
    validated.cookies = await validateWithSchema(
      extractCookies(event.cookies),
      methodConfig.requestBody.$cookies.schema,
      "cookies"
    );
  }

  // Validate query
  if (methodConfig.requestBody?.$query) {
    validated.query = await validateWithSchema(
      extractQuery(event.url.searchParams),
      methodConfig.requestBody.$query.schema,
      "query"
    );
  }

  // Validate path params
  if (methodConfig.requestBody?.$pathParams) {
    validated.pathParams = await validateWithSchema(
      event.params,
      methodConfig.requestBody.$pathParams.schema,
      "pathParams"
    );
  }

  // Validate body
  if (methodConfig.requestBody?.content?.["application/json"]) {
    const clonedRequest = event.request.clone();
    const body = await clonedRequest.json();

    validated.body = await validateWithSchema(
      body,
      methodConfig.requestBody.content["application/json"].schema,
      "body"
    );
  }

  return validated;
}
```

### validateWithSchema()

Core validation function using JSON Schema:

```typescript
function validateWithSchema(
  data: unknown,
  schema: SchemaObject | StandardSchema,
  location: string
): unknown {
  // Convert StandardSchema to JSON Schema
  let jsonSchema = schema;

  if (schema?.["~standard"]?.jsonSchema?.output) {
    jsonSchema = schema["~standard"].jsonSchema.output();
  }

  // Validate using @cfworker/json-schema
  const validator = new Validator(jsonSchema, "2020-12", false);
  const result = validator.validate(data);

  if (!result.valid) {
    // Throw validation error
    throw new ValidationError({
      location,
      errors: result.errors,
    });
  }

  return data;
}
```

**JSON Schema Validator:**

- Uses `@cfworker/json-schema` library
- Supports JSON Schema Draft 2020-12
- Fast C++ implementation via WASM
- Comprehensive error messages

## Output Validation

### validateResponse()

Validates handler response:

```typescript
async function validateResponse(
  response: Response,
  methodConfig: OperationObjectWithValidation
): Promise<Response> {
  const status = response.status.toString();

  // Check allowed status codes
  if (methodConfig.$allowedStatusCodes) {
    if (!methodConfig.$allowedStatusCodes.includes(status)) {
      throw new Error(`Status code ${status} not in allowed codes`);
    }
  }

  // Find matching response schema
  const responseConfig = methodConfig.responses?.[status];
  if (!responseConfig) {
    return response; // No schema for this status
  }

  // Skip if configured
  const schema = responseConfig.content?.["application/json"];
  if (schema?.$_skipValidation) {
    return response;
  }

  // Clone response to read body
  const clonedResponse = response.clone();
  const body = await clonedResponse.json();

  // Validate against schema
  await validateWithSchema(body, schema.schema, "response");

  return response;
}
```

## Helper Injection

### createTypedJson()

Creates type-safe json() helper:

```typescript
function createTypedJson<TData>(
  original: typeof json
): (data: TData, init?: ResponseInit | number) => Response {
  return (data, init) => {
    return original(data, init);
  };
}
```

Used in handler:

```typescript
export async function POST({ validated, json }) {
  // json() is typed to match success response schema
  return json({ id: "123", email: "user@example.com" });
}
```

### createTypedError()

Creates type-safe error() helper:

```typescript
function createTypedError<TErrorData>(
  original: typeof error
): (status: number, body: TErrorData) => never {
  return (status, body) => {
    return original(status, body);
  };
}
```

Used in handler:

```typescript
export async function POST({ validated, error }) {
  // error() is typed to match error response schema
  error(404, { error: "Not found", code: "NOT_FOUND" });
}
```

## Performance

### Per-Route Loading

Each route only loads its own validation code:

```typescript
// Route 1 bundles only its validation
import { validationWrapper } from "sveltekit-auto-openapi/validation-wrapper";
const POST = await validationWrapper(config1, "POST", handler1);

// Route 2 bundles only its validation
import { validationWrapper } from "sveltekit-auto-openapi/validation-wrapper";
const GET = await validationWrapper(config2, "GET", handler2);
```

**Benefits:**

- No monolithic validation bundle
- Tree-shaking eliminates unused code
- Smaller bundles per route

### Validation Cost

**Typical overhead:**

- Simple schema (3 fields): ~1-2ms
- Medium schema (10 fields): ~2-4ms
- Complex schema (30+ fields): ~5-10ms

**Factors affecting performance:**

- Schema complexity
- Validation rules (regex, formats, etc.)
- Data size
- Number of fields validated

### Optimization Strategies

**1. Skip validation in production:**

```typescript
svelteOpenApi({
  skipValidationDefault: {
    response: true, // Skip response validation
  },
});
```

**2. Validate only critical fields:**

```typescript
requestBody: {
  content: {
    'application/json': {
      $_skipValidation: false,  // Validate body
      schema: { /* ... */ }
    }
  },
  $headers: {
    $_skipValidation: true,  // Skip headers
    schema: { /* ... */ }
  }
}
```

**3. Use simpler schemas:**

```typescript
// Fast
{ type: 'string' }

// Slower
{ type: 'string', pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$' }
```

## Internals

### Request/Response Cloning

Validation requires reading the body, but bodies can only be read once. The wrapper clones requests and responses:

```typescript
// Clone request to preserve original
const clonedRequest = event.request.clone();
const body = await clonedRequest.json();

// Validate cloned body
await validateWithSchema(body, schema, "body");

// Original request body still available
```

## Advanced Usage

## Troubleshooting

### Validation not running

**Check:**

- `_config` is exported
- `skipAutoValidation` is not `true`
- Handler uses wrapped function

### Validation errors unclear

**Enable detailed errors:**

```typescript
requestBody: {
  content: {
    'application/json': {
      $_returnDetailedError: true,
      schema: { /* ... */ }
    }
  }
}
```

## Related Documentation

- [Validation Guide](/guides/validation/) - Using validation schemas
- [Route Configuration](/fundamentals/route-config/) - Configuring validation
- [Type System](/advanced/type-system/) - Type utilities
- [Plugin Configuration](/fundamentals/plugin/) - Global validation settings
