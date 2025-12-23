import type { OpenAPIV3 } from "openapi-types";
import { ZodStandardJSONSchemaPayload } from "zod/v4/core";

type Digit = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";
type HttpStatusCodeStart = "1" | "2" | "3" | "4" | "5";

type SpecificStatusCode = `${HttpStatusCodeStart}${Digit}${Digit}`;

type WildcardStatusCode = `${HttpStatusCodeStart}XX`;

type Modify<T, R> = Omit<T, keyof R> & R;

export type OpenApiResponseKey =
  | SpecificStatusCode
  | WildcardStatusCode
  | "default";

// Custom validation configuration for the new consolidated approach
export interface ValidationSchemaConfig {
  $showErrorMessage?: boolean;
  $skipValidation?: boolean;
  schema:
    | ZodStandardJSONSchemaPayload<any>
    | OpenAPIV3.ReferenceObject
    | OpenAPIV3.SchemaObject; // JSON Schema or ZodType - will be converted at build time
}

// Extend OpenAPI MediaTypeObject to include validation flags
export type MediaTypeWithValidation<TSchema = any> = Omit<
  OpenAPIV3.MediaTypeObject,
  "schema"
> & {
  $showErrorMessage?: boolean;
  $skipValidation?: boolean;
  schema?: TSchema;
};

// Extend OpenAPI HeaderObject to include validation config
export type HeaderWithValidation = OpenAPIV3.HeaderObject &
  ValidationSchemaConfig;

// Extend OpenAPI ResponseObject to support validation in content and headers
export type ResponseObjectWithValidation = Omit<
  OpenAPIV3.ResponseObject,
  "content" | "headers"
> & {
  content?: Record<string, MediaTypeWithValidation<any>>;
  headers?: Record<string, HeaderWithValidation>;
};

// Extend OpenAPI OperationObject to include custom validation properties
export type OperationObjectWithValidation = Omit<
  OpenAPIV3.OperationObject,
  "responses" | "requestBody"
> & {
  // Custom operation-level validation properties
  $headers?: ValidationSchemaConfig;
  $query?: ValidationSchemaConfig;
  $pathParams?: ValidationSchemaConfig;
  $cookies?: ValidationSchemaConfig;

  // Override responses to support validation
  responses?: Record<string, ResponseObjectWithValidation>;
  requestBody?: Modify<
    OpenAPIV3.RequestBodyObject,
    {
      content: {
        [media: string]: MediaTypeWithValidation<any>;
      };
    }
  >;
};

// Updated PathItemObject to use OperationObjectWithValidation
type PathItemObject = {
  $ref?: string;
  summary?: string;
  description?: string;
  servers?: OpenAPIV3.ServerObject[];
  parameters?: (OpenAPIV3.ReferenceObject | OpenAPIV3.ParameterObject)[];
} & {
  [method in Uppercase<OpenAPIV3.HttpMethods>]?: OperationObjectWithValidation;
};

// Simplified RouteConfig - only openapiOverride now
export interface RouteConfig {
  openapiOverride?: PathItemObject;
}

export type RouteTypes<T extends RouteConfig> = {
  _types: {
    json: {
      // @ts-expect-error - Need to ensure method keys are uppercase
      [method in Uppercase<OpenAPIV3.HttpMethods>]: NonNullable<
        // @ts-expect-error - Need to ensure method keys are uppercase
        T["openapiOverride"][method]["requestBody"]["content"]["application/json"]["schema"]["~standard"]["types"]
      >["input"];
    };
    returns: {
      // @ts-expect-error - Need to ensure method keys are uppercase
      [method in Uppercase<OpenAPIV3.HttpMethods>]: NonNullable<
        // @ts-expect-error - Need to ensure method keys are uppercase
        T["openapiOverride"][method]["responses"][keyof T["openapiOverride"][method]["responses"]]["content"]["application/json"]["schema"]["~standard"]["types"]
      >["output"];
    };
  };
};

// Type helper to extract input type from schema
type ExtractSchemaType<T> = T extends {
  "~standard": infer Input;
}
  ? // @ts-expect-error - Need to extract types properly
    NonNullable<Input["types"]>["output"]
  : never;

// Type helper to extract expected response type from method config
type ExtractResponseType<TMethod> =
  TMethod extends OperationObjectWithValidation
    ? TMethod["responses"] extends Record<string, ResponseObjectWithValidation>
      ? TMethod["responses"][keyof TMethod["responses"]] extends {
          content: {
            "application/json": {
              schema: infer Schema;
            };
          };
        }
        ? ExtractSchemaType<Schema>
        : never
      : never
    : never;

// Type helper to extract response type for a specific method in config
type ExtractResponseTypeForMethod<
  TConfig extends RouteConfig,
  TMethod extends Uppercase<OpenAPIV3.HttpMethods>
> = TConfig["openapiOverride"] extends PathItemObject
  ? TConfig["openapiOverride"][TMethod] extends OperationObjectWithValidation
    ? ExtractResponseType<TConfig["openapiOverride"][TMethod]>
    : never
  : never;

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
export type ExtractValidatedInputs<TMethod> =
  TMethod extends OperationObjectWithValidation
    ? {
        body: TMethod["requestBody"] extends {
          content: {
            "application/json": {
              $skipValidation?: infer Skip;
              schema: infer Schema;
            };
          };
        }
          ? Skip extends true
            ? ExtractSchemaType<Schema> | undefined
            : ExtractSchemaType<Schema>
          : unknown;
        query: TMethod["$query"] extends {
          $skipValidation?: infer Skip;
          schema: infer Schema;
        }
          ? Skip extends true
            ? ExtractSchemaType<Schema> | undefined
            : ExtractSchemaType<Schema>
          : unknown;
        pathParams: TMethod["$pathParams"] extends {
          $skipValidation?: infer Skip;
          schema: infer Schema;
        }
          ? Skip extends true
            ? ExtractSchemaType<Schema> | undefined
            : ExtractSchemaType<Schema>
          : unknown;
        headers: TMethod["$headers"] extends {
          $skipValidation?: infer Skip;
          schema: infer Schema;
        }
          ? Skip extends true
            ? ExtractSchemaType<Schema> | undefined
            : ExtractSchemaType<Schema>
          : unknown;
        cookies: TMethod["$cookies"] extends {
          $skipValidation?: infer Skip;
          schema: infer Schema;
        }
          ? Skip extends true
            ? ExtractSchemaType<Schema> | undefined
            : ExtractSchemaType<Schema>
          : unknown;
      }
    : never;

// Extract validated input types for a specific method
export type ExtractValidatedInputsForMethod<
  TConfig extends RouteConfig,
  TMethod extends Uppercase<OpenAPIV3.HttpMethods>
> = TConfig["openapiOverride"] extends PathItemObject
  ? TConfig["openapiOverride"][TMethod] extends OperationObjectWithValidation
    ? ExtractValidatedInputs<TConfig["openapiOverride"][TMethod]>
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
