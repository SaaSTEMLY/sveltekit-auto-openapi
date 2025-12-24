import { error, json, RequestHandler } from "@sveltejs/kit";
import type { OpenAPIV3 } from "openapi-types";
import type { RouteConfig } from "../types/routeConfig.ts";
import { Validator } from "@cfworker/json-schema";

export async function validationWrapper(
  _config: RouteConfig,
  method: Uppercase<OpenAPIV3.HttpMethods>,
  requestHandler: RequestHandler,
  skipValidationDefault?:
    | {
        request?:
          | {
              headers?: boolean;
              query?: boolean;
              pathParams?: boolean;
              body?: boolean;
              cookies?: boolean;
            }
          | boolean;
        response?:
          | {
              headers?: boolean;
              body?: boolean;
              cookies?: boolean;
            }
          | boolean;
      }
    | boolean,
  returnsDetailedErrorDefault?:
    | {
        request?:
          | {
              headers?: boolean;
              query?: boolean;
              pathParams?: boolean;
              body?: boolean;
              cookies?: boolean;
            }
          | boolean;
        response?:
          | {
              headers?: boolean;
              body?: boolean;
              cookies?: boolean;
            }
          | boolean;
      }
    | boolean
): Promise<RequestHandler> {
  return async (event) => {
    try {
      const methodConfig = _config.openapiOverride?.[method];
      if (!methodConfig) {
        return requestHandler(event);
      }

      // Validate inputs
      const validatedInputs = await validateInputs(
        event,
        methodConfig,
        skipValidationDefault,
        returnsDetailedErrorDefault
      );

      // Extend event with helpers
      // @ts-expect-error - extending event with validated data
      event.validated = validatedInputs;
      // @ts-expect-error - extending event with typed json helper
      event.json = createTypedJson();
      // @ts-expect-error - extending event with typed error helper
      event.error = createTypedError();

      // Execute handler
      const response = await requestHandler(event);

      // Validate response
      await validateResponse(
        response,
        methodConfig,
        method,
        skipValidationDefault,
        returnsDetailedErrorDefault
      );

      return response;
    } catch (err) {
      // @ts-expect-error - err is of type Error with status and body
      if ("status" in err && "body" in err) {
        return json(err.body, {
          // @ts-expect-error - err is of type Error with status and body
          status: err.status,
        });
      } else {
        // If it's not an Error instance, wrap it in a 500 error
        return json(
          {
            message: "Internal Server Error",
          },
          { status: 500 }
        );
      }
    }
  };
}

async function validateInputs(
  event: any,
  methodConfig: any,
  skipValidationDefault?:
    | {
        request?:
          | {
              headers?: boolean;
              query?: boolean;
              pathParams?: boolean;
              body?: boolean;
              cookies?: boolean;
            }
          | boolean;
        response?:
          | {
              headers?: boolean;
              body?: boolean;
              cookies?: boolean;
            }
          | boolean;
      }
    | boolean,
  returnsDetailedErrorDefault?:
    | {
        request?:
          | {
              headers?: boolean;
              query?: boolean;
              pathParams?: boolean;
              body?: boolean;
              cookies?: boolean;
            }
          | boolean;
        response?:
          | {
              headers?: boolean;
              body?: boolean;
              cookies?: boolean;
            }
          | boolean;
      }
    | boolean
) {
  const validated: any = {
    body: undefined,
    query: {},
    pathParams: {},
    headers: {},
    cookies: {},
  };

  const requestBody = methodConfig.requestBody;
  if (!requestBody) return validated;

  // Validate body
  if (requestBody.content?.["application/json"]) {
    const bodyConfig = requestBody.content["application/json"];

    // Apply default if not explicitly set
    applyValidationDefault(bodyConfig, skipValidationDefault, "request", "body");
    applyDetailedErrorDefault(bodyConfig, returnsDetailedErrorDefault, "request", "body");

    if (!bodyConfig.$_skipValidation) {
      try {
        const clonedRequest = event.request.clone();
        const bodyData = await clonedRequest.json();
        validated.body = await validateWithSchema(
          bodyData,
          bodyConfig.schema,
          bodyConfig.$_returnDetailedError,
          "body"
        );
      } catch (err) {
        // If body is empty or not JSON, leave as undefined
        if (err instanceof SyntaxError) {
          validated.body = undefined;
        } else {
          throw err;
        }
      }
    } else {
      // Skip validation but still parse body
      try {
        const clonedRequest = event.request.clone();
        validated.body = await clonedRequest.json();
      } catch (err) {
        validated.body = undefined;
      }
    }
  }

  // Validate query parameters
  if (requestBody.$query) {
    const queryData = Object.fromEntries(event.url.searchParams);

    // Apply default if not explicitly set
    applyValidationDefault(requestBody.$query, skipValidationDefault, "request", "query");
    applyDetailedErrorDefault(requestBody.$query, returnsDetailedErrorDefault, "request", "query");

    if (!requestBody.$query.$_skipValidation) {
      validated.query = await validateWithSchema(
        queryData,
        requestBody.$query.schema,
        requestBody.$query.$_returnDetailedError,
        "query"
      );
    } else {
      validated.query = queryData;
    }
  } else {
    validated.query = Object.fromEntries(event.url.searchParams);
  }

  // Validate path parameters
  if (requestBody.$pathParams) {
    // Apply default if not explicitly set
    applyValidationDefault(requestBody.$pathParams, skipValidationDefault, "request", "pathParams");
    applyDetailedErrorDefault(requestBody.$pathParams, returnsDetailedErrorDefault, "request", "pathParams");

    if (!requestBody.$pathParams.$_skipValidation) {
      validated.pathParams = await validateWithSchema(
        event.params,
        requestBody.$pathParams.schema,
        requestBody.$pathParams.$_returnDetailedError,
        "pathParams"
      );
    } else {
      validated.pathParams = event.params;
    }
  } else {
    validated.pathParams = event.params;
  }

  // Validate headers
  if (requestBody.$headers) {
    const headersData = Object.fromEntries(event.request.headers);

    // Apply default if not explicitly set
    applyValidationDefault(requestBody.$headers, skipValidationDefault, "request", "headers");
    applyDetailedErrorDefault(requestBody.$headers, returnsDetailedErrorDefault, "request", "headers");

    if (!requestBody.$headers.$_skipValidation) {
      validated.headers = await validateWithSchema(
        headersData,
        requestBody.$headers.schema,
        requestBody.$headers.$_returnDetailedError,
        "headers"
      );
    } else {
      validated.headers = headersData;
    }
  } else {
    validated.headers = Object.fromEntries(event.request.headers);
  }

  // Validate cookies
  if (requestBody.$cookies) {
    const cookiesData = event.cookies
      .getAll()
      .reduce((acc: Record<string, string>, { name, value }: any) => {
        acc[name] = value;
        return acc;
      }, {});

    // Apply default if not explicitly set
    applyValidationDefault(requestBody.$cookies, skipValidationDefault, "request", "cookies");
    applyDetailedErrorDefault(requestBody.$cookies, returnsDetailedErrorDefault, "request", "cookies");

    if (!requestBody.$cookies.$_skipValidation) {
      validated.cookies = await validateWithSchema(
        cookiesData,
        requestBody.$cookies.schema,
        requestBody.$cookies.$_returnDetailedError,
        "cookies"
      );
    } else {
      validated.cookies = cookiesData;
    }
  } else {
    const cookiesData = event.cookies
      .getAll()
      .reduce((acc: Record<string, string>, { name, value }: any) => {
        acc[name] = value;
        return acc;
      }, {});
    validated.cookies = cookiesData;
  }

  return validated;
}

async function validateWithSchema(
  data: any,
  schema: any,
  returnDetailedError: boolean = false,
  fieldName: string
) {
  // Convert StandardSchema to JSON Schema if needed
  let jsonSchema = schema;
  if (schema?.["~standard"]?.jsonSchema?.output) {
    jsonSchema = schema["~standard"].jsonSchema.output();
  }

  // Validate using @cfworker/json-schema
  const validator = new Validator(jsonSchema, "2020-12", false);
  const result = validator.validate(data);

  if (!result.valid) {
    const errorData = returnDetailedError
      ? {
          message: `Validation failed for ${fieldName}`,
          errors: result.errors.map((e) => ({
            message: e.error,
            path: e.instanceLocation,
            keyword: e.keyword,
          })),
        }
      : {
          message: `Validation failed for ${fieldName}`,
        };

    throw error(400, errorData);
  }

  return data;
}

async function validateResponse(
  response: Response,
  methodConfig: any,
  method: string,
  skipValidationDefault?: any,
  returnsDetailedErrorDefault?: any
) {
  const status = response.status.toString();
  const responseConfig = methodConfig.responses?.[status];

  if (!responseConfig) return;

  const contentConfig = responseConfig.content?.["application/json"];
  if (!contentConfig) return;

  // Apply default if not explicitly set
  applyValidationDefault(contentConfig, skipValidationDefault, "response", "body");
  applyDetailedErrorDefault(contentConfig, returnsDetailedErrorDefault, "response", "body");

  if (contentConfig.$_skipValidation) return;

  // Clone response to read body without consuming
  const cloned = response.clone();
  const contentType = response.headers.get("content-type");

  if (!contentType?.includes("application/json")) return;

  const responseData = await cloned.json();
  await validateWithSchema(
    responseData,
    contentConfig.schema,
    contentConfig.$_returnDetailedError,
    "response"
  );
}

function applyValidationDefault(
  config: any,
  skipValidationDefault: any,
  context: "request" | "response",
  field: "headers" | "query" | "pathParams" | "body" | "cookies"
) {
  // Only apply if $_skipValidation is not explicitly set
  if (config.$_skipValidation !== undefined) return;

  if (!skipValidationDefault) return;

  // Handle boolean (apply to all)
  if (typeof skipValidationDefault === "boolean") {
    config.$_skipValidation = skipValidationDefault;
    return;
  }

  // Handle granular configuration
  const contextConfig = skipValidationDefault[context];
  if (!contextConfig) return;

  // If context is boolean, apply to all fields in that context
  if (typeof contextConfig === "boolean") {
    config.$_skipValidation = contextConfig;
    return;
  }

  // Apply field-specific configuration
  if (field in contextConfig) {
    config.$_skipValidation = contextConfig[field as keyof typeof contextConfig];
  }
}

function applyDetailedErrorDefault(
  config: any,
  returnsDetailedErrorDefault: any,
  context: "request" | "response",
  field: "headers" | "query" | "pathParams" | "body" | "cookies"
) {
  // Only apply if $_returnDetailedError is not explicitly set
  if (config.$_returnDetailedError !== undefined) return;

  if (!returnsDetailedErrorDefault) return;

  // Handle boolean (apply to all)
  if (typeof returnsDetailedErrorDefault === "boolean") {
    config.$_returnDetailedError = returnsDetailedErrorDefault;
    return;
  }

  // Handle granular configuration
  const contextConfig = returnsDetailedErrorDefault[context];
  if (!contextConfig) return;

  // If context is boolean, apply to all fields in that context
  if (typeof contextConfig === "boolean") {
    config.$_returnDetailedError = contextConfig;
    return;
  }

  // Apply field-specific configuration
  if (field in contextConfig) {
    config.$_returnDetailedError = contextConfig[field as keyof typeof contextConfig];
  }
}

function createTypedJson() {
  return (data: any, init?: ResponseInit | number) => {
    // Handle both ResponseInit and number (status code)
    if (typeof init === "number") {
      return json(data, { status: init });
    }
    return json(data, init);
  };
}

function createTypedError() {
  return (status: number, body: any) => {
    return error(status, body);
  };
}
