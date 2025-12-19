// Type test file to verify strict type checking works for both json() and error()
import { z } from "zod";
import { useValidation, type RouteConfig } from "./src/request-handler/index";

// Example config with typed success and error responses
export const config = {
  openapiOverride: {
    POST: {
      summary: "Test endpoint",
      requestBody: {
        content: {
          "application/json": {
            schema: z
              .object({
                name: z.string(),
                age: z.number(),
              })
              .toJSONSchema(),
          },
        },
      },
      responses: {
        "200": {
          description: "Success",
          content: {
            "application/json": {
              schema: z
                .object({
                  id: z.string(),
                  message: z.string(),
                })
                .toJSONSchema(),
            },
          },
        },
        "400": {
          description: "Bad Request",
          content: {
            "application/json": {
              schema: z
                .object({
                  error: z.string(),
                  code: z.string(),
                })
                .toJSONSchema(),
            },
          },
        },
        "500": {
          description: "Internal Server Error",
          content: {
            "application/json": {
              schema: z
                .object({
                  error: z.string(),
                  stack: z.string().optional(),
                })
                .toJSONSchema(),
            },
          },
        },
      },
    },
  },
} satisfies RouteConfig;

export const POST = useValidation(
  "POST",
  config,
  async ({ validated, json, error }) => {
    // ✅ This should work - correct success response (2XX)
    if (validated.body.name === "test") {
      return json({
        id: "123",
        message: "User created successfully",
      });
    }

    // ✅ This should FAIL at compile time - wrong success payload structure (uncomment to test)
    // return json({
    //   id: "123",
    //   wrongField: "This will cause a TypeScript error", // Error: 'wrongField' does not exist
    // });

    // ✅ This should work - correct error response with proper payload (4XX)
    if (!validated.body.name) {
      return error(400, {
        error: "Name is required",
        code: "MISSING_NAME",
      });
    }

    // ❌ This should FAIL at compile time - wrong error payload structure (uncomment to test)
    // return error(400, {
    //   message: "This is wrong", // Error: 'message' does not exist in error type
    // });

    // ❌ This should FAIL at compile time - missing required 'code' field (uncomment to test)
    // return error(400, {
    //   error: "Something went wrong",
    // });

    // ❌ This should FAIL at compile time - wrong field type (uncomment to test)
    // return error(400, {
    //   error: "Something went wrong",
    //   code: 123, // Error: 'code' should be string, not number
    // });

    // ✅ This should work - correct 500 error with optional stack (5XX)
    return error(400, {
      error: "Name is required",
      code: "MISSING_NAME",
    });
  }
);
