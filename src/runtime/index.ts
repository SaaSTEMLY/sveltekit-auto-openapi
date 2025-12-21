import {
  RequestHandler,
  json,
  error,
  type RequestEvent,
  isHttpError,
} from "@sveltejs/kit";
import type { OpenAPIV3 } from "openapi-types";
import { Validator } from "@cfworker/json-schema";
import {
  ExtractErrorResponseTypeForMethod,
  ExtractSuccessResponseTypeForMethod,
  ExtractValidatedInputsForMethod,
  HeaderWithValidation,
  MediaTypeWithValidation,
  OperationObjectWithValidation,
  ResponseObjectWithValidation,
  RouteConfig,
  RouteTypes,
  TypedErrorFunction,
  TypedJsonFunction,
  ValidatedInputs,
  ValidationSchemaConfig,
} from "../types/index.ts";

// Helper: Validate data with JSON Schema
function validateWithJsonSchema(
  data: any,
  config: ValidationSchemaConfig,
  context: string
): { success: boolean; error?: any } {
  // Skip validation if flag is set
  if (config.$skipValidation) {
    return { success: true };
  }

  // Validate using @cfworker/json-schema
  const schemaValidator = new Validator(config.schema as any);
  const result = schemaValidator.validate(data);

  if (!result.valid) {
    const shouldShowError =
      config.$showErrorMessage ??
      (typeof process !== "undefined" && process.env.NODE_ENV === "development"
        ? true
        : false);

    if (shouldShowError) {
      // Format errors from JSON Schema validator
      const formattedErrors = result.errors.map((err: any) => ({
        path:
          err.instanceLocation.replace(/^\//, "").replace(/\//g, ".") || "root",
        message: err.error,
        keyword: err.keyword,
      }));

      return {
        success: false,
        error: {
          error: `${context} validation failed`,
          issues: formattedErrors,
        },
      };
    } else {
      // Generic error for production
      return {
        success: false,
        error: {
          error: context.includes("Response")
            ? "Internal server error"
            : "Invalid request data",
        },
      };
    }
  }

  return { success: true };
}

export const __validate = <
  TMethod extends Uppercase<OpenAPIV3.HttpMethods> = Uppercase<OpenAPIV3.HttpMethods>,
  Config extends RouteConfig = RouteConfig
>(
  method: TMethod,
  config: Config,
  handler: (
    event: RouteConfig["openapiOverride"] extends undefined
      ? RequestEvent & {
          json: TypedJsonFunction<
            RouteTypes<Config>["_types"]["returns"][TMethod]
          >;
          error: TypedErrorFunction<
            ExtractErrorResponseTypeForMethod<Config, TMethod>
          >;
        }
      : RequestEvent & {
          json: TypedJsonFunction<
            ExtractSuccessResponseTypeForMethod<Config, TMethod>
          >;
          error: TypedErrorFunction<
            ExtractErrorResponseTypeForMethod<Config, TMethod>
          >;
          validated: ValidatedInputs<
            ExtractValidatedInputsForMethod<Config, TMethod>
          >;
        }
  ) => Promise<Response> | Response
): RequestHandler => {
  return async (event) => {
    try {
      const eventWithHelpers = event as RequestEvent & {
        json: TypedJsonFunction<
          ExtractSuccessResponseTypeForMethod<Config, TMethod>
        >;
        error: TypedErrorFunction<
          ExtractErrorResponseTypeForMethod<Config, TMethod>
        >;
      };
      // @ts-expect-error - Bypass typing for json helper
      eventWithHelpers.json = json;
      eventWithHelpers.error = error as any;
      const openapiOverride = (config as RouteConfig).openapiOverride;

      // Collect validated inputs for passing to handler
      let headers: Record<string, string> | undefined;
      let query: Record<string, string> | undefined;
      let pathParams: Record<string, string> | undefined;
      let cookies: Record<string, string> | undefined;
      let body: any | undefined;

      if (!openapiOverride || !openapiOverride[method]) {
        // No validation config for this method
        // @ts-expect-error - Bypass typing when
        return await handler(eventWithHelpers);
      }

      const methodConfig = openapiOverride[
        method
      ] as OperationObjectWithValidation;

      // ===== INPUT VALIDATION =====

      // Validate headers
      if (methodConfig.$headers) {
        headers = {};
        event.request.headers.forEach((value: string, key: string) => {
          headers![key] = value;
        });

        const result = validateWithJsonSchema(
          headers,
          methodConfig.$headers,
          "Headers"
        );

        if (!result.success) {
          return json(result.error, { status: 400 });
        }
      }

      // Validate query parameters
      if (methodConfig.$query) {
        const url = new URL(event.request.url);
        query = {};

        url.searchParams.forEach((value, key) => {
          query![key] = value;
        });

        const result = validateWithJsonSchema(
          query,
          methodConfig.$query,
          "Query parameters"
        );

        if (!result.success) {
          return json(result.error, { status: 400 });
        }
      }

      // Validate path parameters
      if (methodConfig.$pathParams) {
        pathParams = event.params;

        const result = validateWithJsonSchema(
          pathParams,
          methodConfig.$pathParams,
          "Path parameters"
        );

        if (!result.success) {
          return json(result.error, { status: 400 });
        }
      }

      // Validate cookies
      if (methodConfig.$cookies) {
        cookies = {};
        const cookieHeader = event.request.headers.get("cookie");

        if (cookieHeader) {
          cookieHeader.split(";").forEach((cookie: string) => {
            const [name, ...valueParts] = cookie.trim().split("=");
            if (name) {
              cookies![name] = valueParts.join("=");
            }
          });
        }

        const result = validateWithJsonSchema(
          cookies,
          methodConfig.$cookies,
          "Cookies"
        );

        if (!result.success) {
          return json(result.error, { status: 400 });
        }
      }

      // Validate request body
      if (methodConfig.requestBody) {
        const contentType = event.request.headers.get("content-type");
        const requestBodyContent = methodConfig.requestBody.content;

        if (
          contentType?.includes("application/json") &&
          requestBodyContent?.["application/json"]
        ) {
          const bodyConfig = requestBodyContent[
            "application/json"
          ] as MediaTypeWithValidation;

          if (bodyConfig.schema) {
            const clonedRequest = event.request.clone();

            try {
              body = await clonedRequest.json();
            } catch (e) {
              return json(
                { error: "Invalid JSON in request body" },
                { status: 400 }
              );
            }

            const schemaConfig: ValidationSchemaConfig = {
              schema: bodyConfig.schema,
              $skipValidation: bodyConfig.$skipValidation,
              $showErrorMessage: bodyConfig.$showErrorMessage,
            };

            const result = validateWithJsonSchema(
              body,
              schemaConfig,
              "Request body"
            );

            if (!result.success) {
              return json(result.error, { status: 400 });
            }
          }
        }
      }

      // Attach validated inputs to event for easy access
      // Event remains untouched, we just add a property
      const eventWithValidated = eventWithHelpers as typeof eventWithHelpers & {
        validated: ValidatedInputs<
          ExtractValidatedInputsForMethod<Config, TMethod>
        >;
      };
      eventWithValidated.validated = {
        body,
        query,
        pathParams,
        headers,
        cookies,
      } as ValidatedInputs<ExtractValidatedInputsForMethod<Config, TMethod>>;

      // Call the actual handler
      const response = await handler(eventWithValidated);

      // ===== OUTPUT VALIDATION =====
      if (methodConfig.responses) {
        const statusCode = response.status.toString();
        let responseConfig: ResponseObjectWithValidation | undefined =
          methodConfig.responses[statusCode];

        // Try wildcard pattern (e.g., "2XX" for 200-299)
        if (!responseConfig) {
          const wildcardCode = `${statusCode[0]}XX`;
          responseConfig = methodConfig.responses[wildcardCode];
        }

        // Try default
        if (!responseConfig) {
          responseConfig = methodConfig.responses.default;
        }

        if (responseConfig) {
          const contentType = response.headers.get("content-type");

          // Validate response body
          if (
            contentType?.includes("application/json") &&
            responseConfig.content?.["application/json"]
          ) {
            const bodyConfig = responseConfig.content[
              "application/json"
            ] as MediaTypeWithValidation;

            if (bodyConfig.schema) {
              const clonedResponse = response.clone();
              let responseBody: unknown;

              try {
                responseBody = await clonedResponse.json();
              } catch (e) {
                // Not JSON or empty, skip validation
                return response;
              }

              const schemaConfig: ValidationSchemaConfig = {
                schema: bodyConfig.schema,
                $skipValidation: bodyConfig.$skipValidation,
                $showErrorMessage: bodyConfig.$showErrorMessage,
              };

              const result = validateWithJsonSchema(
                responseBody,
                schemaConfig,
                "Response body"
              );

              if (!result.success) {
                console.error("[__validate] Response body validation failed:", {
                  route: event.route.id,
                  method: event.request.method,
                  error: result.error,
                });
                return json(result.error, { status: 500 });
              }
            }
          }

          // Validate response headers
          if (responseConfig.headers) {
            const headers: Record<string, string> = {};
            response.headers.forEach((value: string, key: string) => {
              headers[key] = value;
            });

            for (const [headerName, headerConfig] of Object.entries(
              responseConfig.headers
            )) {
              const headerValue = headers[headerName.toLowerCase()];
              const schemaConfig = headerConfig as HeaderWithValidation;

              const result = validateWithJsonSchema(
                headerValue,
                schemaConfig,
                `Response header '${headerName}'`
              );

              if (!result.success) {
                console.error(
                  "[__validate] Response header validation failed:",
                  {
                    route: event.route.id,
                    method: event.request.method,
                    header: headerName,
                    error: result.error,
                  }
                );
                return json(result.error, { status: 500 });
              }
            }
          }
        }
      }

      return response;
    } catch (e) {
      if (isHttpError(e)) {
        // if status and body validations are set, validate the body, if invalid throw 500, if they dont exist, just rethrow
        const openapiOverride = (config as RouteConfig).openapiOverride;

        if (!openapiOverride || !openapiOverride[method]) {
          // No validation config, just rethrow
          throw e;
        }

        const methodConfig = openapiOverride[
          method
        ] as OperationObjectWithValidation;

        if (!methodConfig.responses) {
          // No response validations configured, just rethrow
          throw e;
        }

        const statusCode = e.status.toString();
        let responseConfig: ResponseObjectWithValidation | undefined =
          methodConfig.responses[statusCode];

        // Try wildcard pattern (e.g., "4XX" for 400-499)
        if (!responseConfig) {
          const wildcardCode = `${statusCode[0]}XX`;
          responseConfig = methodConfig.responses[wildcardCode];
        }

        // Try default
        if (!responseConfig) {
          responseConfig = methodConfig.responses.default;
        }

        if (!responseConfig) {
          // No validation config for this status code, just rethrow
          throw e;
        }

        // Check if there's a JSON body schema to validate
        const bodyConfig = responseConfig.content?.["application/json"] as
          | MediaTypeWithValidation
          | undefined;

        if (!bodyConfig?.schema) {
          // No schema validation configured, just rethrow
          throw e;
        }

        // Validate the error body
        const schemaConfig: ValidationSchemaConfig = {
          schema: bodyConfig.schema,
          $skipValidation: bodyConfig.$skipValidation,
          $showErrorMessage: bodyConfig.$showErrorMessage,
        };

        const result = validateWithJsonSchema(
          e.body,
          schemaConfig,
          "Error response body"
        );

        if (!result.success) {
          // Validation failed, return 500
          console.error("[__validate] Error response body validation failed:", {
            route: event.route.id,
            method: event.request.method,
            status: e.status,
            error: result.error,
          });
          return json(
            {
              error: "Internal server error - invalid error response format",
            },
            { status: 500 }
          );
        }

        // Validation passed, return the error as a proper JSON response
        return json(e.body, { status: e.status });
      }
      throw e;
    }
  };
};
