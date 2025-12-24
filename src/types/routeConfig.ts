import type { OpenAPIV3 } from "openapi-types";
import { ZodObject } from "zod";
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
  /**
   * @description If true, returns detailed error responses for the schema.
   * @default false
   */
  $_returnDetailedError?: boolean;
  /**
   * @description If true, skips validation for the schema.
   * @default false
   */
  $_skipValidation?: boolean;
  schema:
    | ZodStandardJSONSchemaPayload<any>
    | OpenAPIV3.ReferenceObject
    | OpenAPIV3.SchemaObject; // JSON Schema or ZodType - will be converted at build time
}

// Extend OpenAPI MediaTypeObject to include validation flags
export type MediaTypeWithValidation = Modify<
  OpenAPIV3.MediaTypeObject,
  ValidationSchemaConfig
>;

// Extend OpenAPI ResponseObject to support validation in content and headers
export type ResponseObjectWithValidation = Modify<
  OpenAPIV3.ResponseObject,
  {
    $headers?: ValidationSchemaConfig;
    $cookies?: ValidationSchemaConfig;
    content?: Record<string, MediaTypeWithValidation>;
  }
>;

// Extend OpenAPI OperationObject to include custom validation properties
export type OperationObjectWithValidation = Modify<
  OpenAPIV3.OperationObject,
  {
    // If specified, only these status codes are allowed in the response
    $allowedStatusCodes?: OpenApiResponseKey[];
    responses?: Partial<
      Record<OpenApiResponseKey, ResponseObjectWithValidation>
    >;
    requestBody?: Modify<
      OpenAPIV3.RequestBodyObject,
      {
        $headers?: ValidationSchemaConfig;
        $query?: ValidationSchemaConfig;
        $pathParams?: ValidationSchemaConfig;
        $cookies?: ValidationSchemaConfig;
        content?: {
          [media: string]: MediaTypeWithValidation;
        };
      }
    >;
  }
>;

// Updated PathItemObject to use OperationObjectWithValidation
export type PathItemObject = {
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
