import type { OpenAPIV3 } from "openapi-types";
import {
  OperationObjectWithValidation,
  PathItemObject,
  ResponseObjectWithValidation,
  RouteConfig,
} from "./routeConfig.ts";

// Type helper to extract input type from schema
type ExtractSchemaType<T> = T extends {
  "~standard": infer Input;
}
  ? // @ts-expect-error - Need to extract types properly
    NonNullable<Input["types"]>["output"]
  : // Handle plain JSON Schema objects - infer from the schema structure
    T extends { type: "object"; properties: infer Props }
    ? ExtractObjectType<Props>
    : T extends { type: "array"; items: infer Items }
      ? Array<ExtractSchemaType<Items>>
      : T extends { type: "string"; const: infer Const }
        ? Const
        : T extends { type: "string" }
          ? string
          : T extends { type: "number" | "integer" }
            ? number
            : T extends { type: "boolean"; const: infer Const }
              ? Const
              : T extends { type: "boolean" }
                ? boolean
                : T extends { type: "null" }
                  ? null
                  : T extends { const: infer Const }
                    ? Const
                    : any;

// Helper to extract object properties from JSON Schema
type ExtractObjectType<Props> = Props extends Record<string, any>
  ? {
      [K in keyof Props]: ExtractSchemaType<Props[K]>;
    }
  : any;

// Type helper to extract success response types (2XX) from method config
type ExtractSuccessResponseType<TMethod> =
  TMethod extends OperationObjectWithValidation
    ? TMethod["responses"] extends Record<string, ResponseObjectWithValidation>
      ? {
          [K in keyof TMethod["responses"]]: K extends `2${string}`
            ? TMethod["responses"][K] extends {
                content: {
                  "application/json": {
                    schema: infer Schema;
                  };
                };
              }
              ? ExtractSchemaType<Schema>
              : never
            : never;
        }[keyof TMethod["responses"]]
      : never
    : never;

// Type helper to extract success response type for a specific method in config
export type ExtractSuccessResponseTypeForMethod<
  TConfig extends RouteConfig,
  TMethod extends Uppercase<OpenAPIV3.HttpMethods>
> = TConfig["openapiOverride"] extends PathItemObject
  ? TConfig["openapiOverride"][TMethod] extends OperationObjectWithValidation
    ? ExtractSuccessResponseType<TConfig["openapiOverride"][TMethod]>
    : never
  : never;

// Type helper to extract error response types (4XX, 5XX, default) from method config
type ExtractErrorResponseType<TMethod> =
  TMethod extends OperationObjectWithValidation
    ? TMethod["responses"] extends Record<string, ResponseObjectWithValidation>
      ? {
          [K in keyof TMethod["responses"]]: K extends
            | `4${string}`
            | `5${string}`
            | "default"
            ? TMethod["responses"][K] extends {
                content: {
                  "application/json": {
                    schema: infer Schema;
                  };
                };
              }
              ? ExtractSchemaType<Schema>
              : never
            : never;
        }[keyof TMethod["responses"]]
      : never
    : never;

// Type helper to extract error response type for a specific method in config
export type ExtractErrorResponseTypeForMethod<
  TConfig extends RouteConfig,
  TMethod extends Uppercase<OpenAPIV3.HttpMethods>
> = TConfig["openapiOverride"] extends PathItemObject
  ? TConfig["openapiOverride"][TMethod] extends OperationObjectWithValidation
    ? ExtractErrorResponseType<TConfig["openapiOverride"][TMethod]>
    : never
  : never;

// Typed json function that enforces return type
export type TypedJsonFunction<TData> = (
  data: TData,
  init?: ResponseInit | number
) => Response;

// Typed error function that enforces error payload type
export type TypedErrorFunction<TErrorData> = (
  status: number,
  body: TErrorData
) => never;

// Type helper to extract validated inputs from a method config
export type ExtractValidatedInputs<
  TMethod extends OperationObjectWithValidation["requestBody"]
> = TMethod extends undefined
  ? never
  : {
      body: NonNullable<TMethod>["content"] extends {
        "application/json": {
          $_skipValidation?: infer Skip;
          schema: infer Schema;
        };
      }
        ? Skip extends true
          ? ExtractSchemaType<Schema> | undefined
          : ExtractSchemaType<Schema>
        : unknown;
      query: NonNullable<TMethod>["$query"] extends {
        $_skipValidation?: infer Skip;
        schema: infer Schema;
      }
        ? Skip extends true
          ? ExtractSchemaType<Schema> | undefined
          : ExtractSchemaType<Schema>
        : unknown;
      pathParams: NonNullable<TMethod>["$pathParams"] extends {
        $_skipValidation?: infer Skip;
        schema: infer Schema;
      }
        ? Skip extends true
          ? ExtractSchemaType<Schema> | undefined
          : ExtractSchemaType<Schema>
        : unknown;
      headers: NonNullable<TMethod>["$headers"] extends {
        $_skipValidation?: infer Skip;
        schema: infer Schema;
      }
        ? Skip extends true
          ? ExtractSchemaType<Schema> | undefined
          : ExtractSchemaType<Schema>
        : unknown;
      cookies: NonNullable<TMethod>["$cookies"] extends {
        $_skipValidation?: infer Skip;
        schema: infer Schema;
      }
        ? Skip extends true
          ? ExtractSchemaType<Schema> | undefined
          : ExtractSchemaType<Schema>
        : unknown;
    };

// Extract validated input types for a specific method
export type ExtractValidatedInputsForMethod<
  TConfig extends RouteConfig,
  TMethod extends Uppercase<OpenAPIV3.HttpMethods>
> = TConfig["openapiOverride"] extends PathItemObject
  ? TConfig["openapiOverride"][TMethod] extends OperationObjectWithValidation
    ? ExtractValidatedInputs<TConfig["openapiOverride"][TMethod]["requestBody"]>
    : never
  : never;

// Generic validated inputs interface
export interface ValidatedInputs<TInputs = any> {
  body: TInputs extends { body: infer Body } ? Body : any;
  query: TInputs extends { query: infer Query }
    ? Query
    : Record<string, string>;
  pathParams: TInputs extends { pathParams: infer PathParams }
    ? PathParams
    : Record<string, string>;
  headers: TInputs extends { headers: infer Headers }
    ? Headers
    : Record<string, string>;
  cookies: TInputs extends { cookies: infer Cookies }
    ? Cookies
    : Record<string, string>;
}

/**
 * Combined helper types injected into RequestEvent for a specific HTTP method.
 * Used by generated $types.d.ts files to augment RequestEvent with validation helpers.
 */
export type InjectedHelpers<
  Config extends RouteConfig,
  Method extends Uppercase<OpenAPIV3.HttpMethods>
> = {
  validated: ValidatedInputs<ExtractValidatedInputsForMethod<Config, Method>>;
  json: TypedJsonFunction<ExtractSuccessResponseTypeForMethod<Config, Method>>;
  error: TypedErrorFunction<ExtractErrorResponseTypeForMethod<Config, Method>>;
};
