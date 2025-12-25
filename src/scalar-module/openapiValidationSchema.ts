import { OpenAPIV3 } from "openapi-types";

export const OpenAPISchema = {
  type: "object",
  properties: {
    openapi: {
      type: "string",
      pattern: "^3\\.\\d+\\.\\d+$",
    },
    info: {
      type: "object",
      properties: {
        title: {
          type: "string",
        },
        description: {
          type: "string",
        },
        termsOfService: {
          type: "string",
          format: "uri",
        },
        contact: {
          type: "object",
          properties: {
            name: {
              type: "string",
            },
            url: {
              type: "string",
              format: "uri",
            },
            email: {
              type: "string",
              format: "email",
              pattern:
                "^(?!\\.)(?!.*\\.\\.)([A-Za-z0-9_'+\\-\\.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9\\-]*\\.)+[A-Za-z]{2,}$",
            },
          },
          additionalProperties: {},
        },
        license: {
          type: "object",
          properties: {
            name: {
              type: "string",
            },
            url: {
              type: "string",
              format: "uri",
            },
          },
          required: ["name"],
          additionalProperties: {},
        },
        version: {
          type: "string",
        },
      },
      required: ["title", "version"],
      additionalProperties: {},
    },
    servers: {
      type: "array",
      items: {
        type: "object",
        properties: {
          url: {
            type: "string",
          },
          description: {
            type: "string",
          },
          variables: {
            type: "object",
            propertyNames: {
              type: "string",
            },
            additionalProperties: {
              type: "object",
              properties: {
                enum: {
                  type: "array",
                  items: {
                    type: "string",
                  },
                },
                default: {
                  type: "string",
                },
                description: {
                  type: "string",
                },
              },
              required: ["default"],
              additionalProperties: {},
            },
          },
        },
        required: ["url"],
        additionalProperties: {},
      },
    },
    paths: {
      type: "object",
      propertyNames: {
        type: "string",
        pattern: "^\\/.*",
      },
      additionalProperties: {
        type: "object",
        properties: {
          $ref: {
            type: "string",
          },
          summary: {
            type: "string",
          },
          description: {
            type: "string",
          },
          get: {
            type: "object",
            properties: {
              tags: {
                type: "array",
                items: {
                  type: "string",
                },
              },
              summary: {
                type: "string",
              },
              description: {
                type: "string",
              },
              externalDocs: {
                type: "object",
                properties: {
                  description: {
                    type: "string",
                  },
                  url: {
                    type: "string",
                    format: "uri",
                  },
                },
                required: ["url"],
                additionalProperties: {},
              },
              operationId: {
                type: "string",
              },
              parameters: {
                type: "array",
                items: {
                  anyOf: [
                    {
                      type: "object",
                      properties: {
                        name: {
                          type: "string",
                        },
                        in: {
                          type: "string",
                          enum: ["query", "header", "path", "cookie"],
                        },
                        description: {
                          type: "string",
                        },
                        required: {
                          type: "boolean",
                        },
                        deprecated: {
                          type: "boolean",
                        },
                        allowEmptyValue: {
                          type: "boolean",
                        },
                        schema: {
                          anyOf: [
                            {
                              $ref: "#/$defs/__schema0",
                            },
                            {
                              type: "object",
                              properties: {
                                $ref: {
                                  type: "string",
                                },
                                summary: {
                                  type: "string",
                                },
                                description: {
                                  type: "string",
                                },
                              },
                              required: ["$ref"],
                              additionalProperties: {},
                            },
                          ],
                        },
                        style: {
                          type: "string",
                        },
                        explode: {
                          type: "boolean",
                        },
                        example: {},
                      },
                      required: ["name", "in"],
                      additionalProperties: {},
                    },
                    {
                      type: "object",
                      properties: {
                        $ref: {
                          type: "string",
                        },
                        summary: {
                          type: "string",
                        },
                        description: {
                          type: "string",
                        },
                      },
                      required: ["$ref"],
                      additionalProperties: {},
                    },
                  ],
                },
              },
              requestBody: {
                anyOf: [
                  {
                    type: "object",
                    properties: {
                      description: {
                        type: "string",
                      },
                      content: {
                        type: "object",
                        propertyNames: {
                          type: "string",
                        },
                        additionalProperties: {
                          type: "object",
                          properties: {
                            schema: {
                              anyOf: [
                                {
                                  $ref: "#/$defs/__schema0",
                                },
                                {
                                  type: "object",
                                  properties: {
                                    $ref: {
                                      type: "string",
                                    },
                                    summary: {
                                      type: "string",
                                    },
                                    description: {
                                      type: "string",
                                    },
                                  },
                                  required: ["$ref"],
                                  additionalProperties: {},
                                },
                              ],
                            },
                            example: {},
                            examples: {
                              type: "object",
                              propertyNames: {
                                type: "string",
                              },
                              additionalProperties: {},
                            },
                            encoding: {
                              type: "object",
                              propertyNames: {
                                type: "string",
                              },
                              additionalProperties: {},
                            },
                          },
                          additionalProperties: {},
                        },
                      },
                      required: {
                        type: "boolean",
                      },
                    },
                    required: ["content"],
                    additionalProperties: {},
                  },
                  {
                    type: "object",
                    properties: {
                      $ref: {
                        type: "string",
                      },
                      summary: {
                        type: "string",
                      },
                      description: {
                        type: "string",
                      },
                    },
                    required: ["$ref"],
                    additionalProperties: {},
                  },
                ],
              },
              responses: {
                type: "object",
                propertyNames: {
                  type: "string",
                },
                additionalProperties: {
                  anyOf: [
                    {
                      type: "object",
                      properties: {
                        description: {
                          type: "string",
                        },
                        headers: {
                          type: "object",
                          propertyNames: {
                            type: "string",
                          },
                          additionalProperties: {
                            anyOf: [
                              {
                                type: "object",
                                properties: {
                                  $ref: {
                                    type: "string",
                                  },
                                  summary: {
                                    type: "string",
                                  },
                                  description: {
                                    type: "string",
                                  },
                                },
                                required: ["$ref"],
                                additionalProperties: {},
                              },
                              {},
                            ],
                          },
                        },
                        content: {
                          type: "object",
                          propertyNames: {
                            type: "string",
                          },
                          additionalProperties: {
                            type: "object",
                            properties: {
                              schema: {
                                anyOf: [
                                  {
                                    $ref: "#/$defs/__schema0",
                                  },
                                  {
                                    type: "object",
                                    properties: {
                                      $ref: {
                                        type: "string",
                                      },
                                      summary: {
                                        type: "string",
                                      },
                                      description: {
                                        type: "string",
                                      },
                                    },
                                    required: ["$ref"],
                                    additionalProperties: {},
                                  },
                                ],
                              },
                              example: {},
                              examples: {
                                type: "object",
                                propertyNames: {
                                  type: "string",
                                },
                                additionalProperties: {},
                              },
                              encoding: {
                                type: "object",
                                propertyNames: {
                                  type: "string",
                                },
                                additionalProperties: {},
                              },
                            },
                            additionalProperties: {},
                          },
                        },
                        links: {
                          type: "object",
                          propertyNames: {
                            type: "string",
                          },
                          additionalProperties: {},
                        },
                      },
                      required: ["description"],
                      additionalProperties: {},
                    },
                    {
                      type: "object",
                      properties: {
                        $ref: {
                          type: "string",
                        },
                        summary: {
                          type: "string",
                        },
                        description: {
                          type: "string",
                        },
                      },
                      required: ["$ref"],
                      additionalProperties: {},
                    },
                  ],
                },
              },
              deprecated: {
                type: "boolean",
              },
              security: {
                type: "array",
                items: {
                  type: "object",
                  propertyNames: {
                    type: "string",
                  },
                  additionalProperties: {
                    type: "array",
                    items: {
                      type: "string",
                    },
                  },
                },
              },
              servers: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    url: {
                      type: "string",
                    },
                    description: {
                      type: "string",
                    },
                    variables: {
                      type: "object",
                      propertyNames: {
                        type: "string",
                      },
                      additionalProperties: {
                        type: "object",
                        properties: {
                          enum: {
                            type: "array",
                            items: {
                              type: "string",
                            },
                          },
                          default: {
                            type: "string",
                          },
                          description: {
                            type: "string",
                          },
                        },
                        required: ["default"],
                        additionalProperties: {},
                      },
                    },
                  },
                  required: ["url"],
                  additionalProperties: {},
                },
              },
            },
            required: ["responses"],
            additionalProperties: {},
          },
          put: {
            type: "object",
            properties: {
              tags: {
                type: "array",
                items: {
                  type: "string",
                },
              },
              summary: {
                type: "string",
              },
              description: {
                type: "string",
              },
              externalDocs: {
                type: "object",
                properties: {
                  description: {
                    type: "string",
                  },
                  url: {
                    type: "string",
                    format: "uri",
                  },
                },
                required: ["url"],
                additionalProperties: {},
              },
              operationId: {
                type: "string",
              },
              parameters: {
                type: "array",
                items: {
                  anyOf: [
                    {
                      type: "object",
                      properties: {
                        name: {
                          type: "string",
                        },
                        in: {
                          type: "string",
                          enum: ["query", "header", "path", "cookie"],
                        },
                        description: {
                          type: "string",
                        },
                        required: {
                          type: "boolean",
                        },
                        deprecated: {
                          type: "boolean",
                        },
                        allowEmptyValue: {
                          type: "boolean",
                        },
                        schema: {
                          anyOf: [
                            {
                              $ref: "#/$defs/__schema0",
                            },
                            {
                              type: "object",
                              properties: {
                                $ref: {
                                  type: "string",
                                },
                                summary: {
                                  type: "string",
                                },
                                description: {
                                  type: "string",
                                },
                              },
                              required: ["$ref"],
                              additionalProperties: {},
                            },
                          ],
                        },
                        style: {
                          type: "string",
                        },
                        explode: {
                          type: "boolean",
                        },
                        example: {},
                      },
                      required: ["name", "in"],
                      additionalProperties: {},
                    },
                    {
                      type: "object",
                      properties: {
                        $ref: {
                          type: "string",
                        },
                        summary: {
                          type: "string",
                        },
                        description: {
                          type: "string",
                        },
                      },
                      required: ["$ref"],
                      additionalProperties: {},
                    },
                  ],
                },
              },
              requestBody: {
                anyOf: [
                  {
                    type: "object",
                    properties: {
                      description: {
                        type: "string",
                      },
                      content: {
                        type: "object",
                        propertyNames: {
                          type: "string",
                        },
                        additionalProperties: {
                          type: "object",
                          properties: {
                            schema: {
                              anyOf: [
                                {
                                  $ref: "#/$defs/__schema0",
                                },
                                {
                                  type: "object",
                                  properties: {
                                    $ref: {
                                      type: "string",
                                    },
                                    summary: {
                                      type: "string",
                                    },
                                    description: {
                                      type: "string",
                                    },
                                  },
                                  required: ["$ref"],
                                  additionalProperties: {},
                                },
                              ],
                            },
                            example: {},
                            examples: {
                              type: "object",
                              propertyNames: {
                                type: "string",
                              },
                              additionalProperties: {},
                            },
                            encoding: {
                              type: "object",
                              propertyNames: {
                                type: "string",
                              },
                              additionalProperties: {},
                            },
                          },
                          additionalProperties: {},
                        },
                      },
                      required: {
                        type: "boolean",
                      },
                    },
                    required: ["content"],
                    additionalProperties: {},
                  },
                  {
                    type: "object",
                    properties: {
                      $ref: {
                        type: "string",
                      },
                      summary: {
                        type: "string",
                      },
                      description: {
                        type: "string",
                      },
                    },
                    required: ["$ref"],
                    additionalProperties: {},
                  },
                ],
              },
              responses: {
                type: "object",
                propertyNames: {
                  type: "string",
                },
                additionalProperties: {
                  anyOf: [
                    {
                      type: "object",
                      properties: {
                        description: {
                          type: "string",
                        },
                        headers: {
                          type: "object",
                          propertyNames: {
                            type: "string",
                          },
                          additionalProperties: {
                            anyOf: [
                              {
                                type: "object",
                                properties: {
                                  $ref: {
                                    type: "string",
                                  },
                                  summary: {
                                    type: "string",
                                  },
                                  description: {
                                    type: "string",
                                  },
                                },
                                required: ["$ref"],
                                additionalProperties: {},
                              },
                              {},
                            ],
                          },
                        },
                        content: {
                          type: "object",
                          propertyNames: {
                            type: "string",
                          },
                          additionalProperties: {
                            type: "object",
                            properties: {
                              schema: {
                                anyOf: [
                                  {
                                    $ref: "#/$defs/__schema0",
                                  },
                                  {
                                    type: "object",
                                    properties: {
                                      $ref: {
                                        type: "string",
                                      },
                                      summary: {
                                        type: "string",
                                      },
                                      description: {
                                        type: "string",
                                      },
                                    },
                                    required: ["$ref"],
                                    additionalProperties: {},
                                  },
                                ],
                              },
                              example: {},
                              examples: {
                                type: "object",
                                propertyNames: {
                                  type: "string",
                                },
                                additionalProperties: {},
                              },
                              encoding: {
                                type: "object",
                                propertyNames: {
                                  type: "string",
                                },
                                additionalProperties: {},
                              },
                            },
                            additionalProperties: {},
                          },
                        },
                        links: {
                          type: "object",
                          propertyNames: {
                            type: "string",
                          },
                          additionalProperties: {},
                        },
                      },
                      required: ["description"],
                      additionalProperties: {},
                    },
                    {
                      type: "object",
                      properties: {
                        $ref: {
                          type: "string",
                        },
                        summary: {
                          type: "string",
                        },
                        description: {
                          type: "string",
                        },
                      },
                      required: ["$ref"],
                      additionalProperties: {},
                    },
                  ],
                },
              },
              deprecated: {
                type: "boolean",
              },
              security: {
                type: "array",
                items: {
                  type: "object",
                  propertyNames: {
                    type: "string",
                  },
                  additionalProperties: {
                    type: "array",
                    items: {
                      type: "string",
                    },
                  },
                },
              },
              servers: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    url: {
                      type: "string",
                    },
                    description: {
                      type: "string",
                    },
                    variables: {
                      type: "object",
                      propertyNames: {
                        type: "string",
                      },
                      additionalProperties: {
                        type: "object",
                        properties: {
                          enum: {
                            type: "array",
                            items: {
                              type: "string",
                            },
                          },
                          default: {
                            type: "string",
                          },
                          description: {
                            type: "string",
                          },
                        },
                        required: ["default"],
                        additionalProperties: {},
                      },
                    },
                  },
                  required: ["url"],
                  additionalProperties: {},
                },
              },
            },
            required: ["responses"],
            additionalProperties: {},
          },
          post: {
            type: "object",
            properties: {
              tags: {
                type: "array",
                items: {
                  type: "string",
                },
              },
              summary: {
                type: "string",
              },
              description: {
                type: "string",
              },
              externalDocs: {
                type: "object",
                properties: {
                  description: {
                    type: "string",
                  },
                  url: {
                    type: "string",
                    format: "uri",
                  },
                },
                required: ["url"],
                additionalProperties: {},
              },
              operationId: {
                type: "string",
              },
              parameters: {
                type: "array",
                items: {
                  anyOf: [
                    {
                      type: "object",
                      properties: {
                        name: {
                          type: "string",
                        },
                        in: {
                          type: "string",
                          enum: ["query", "header", "path", "cookie"],
                        },
                        description: {
                          type: "string",
                        },
                        required: {
                          type: "boolean",
                        },
                        deprecated: {
                          type: "boolean",
                        },
                        allowEmptyValue: {
                          type: "boolean",
                        },
                        schema: {
                          anyOf: [
                            {
                              $ref: "#/$defs/__schema0",
                            },
                            {
                              type: "object",
                              properties: {
                                $ref: {
                                  type: "string",
                                },
                                summary: {
                                  type: "string",
                                },
                                description: {
                                  type: "string",
                                },
                              },
                              required: ["$ref"],
                              additionalProperties: {},
                            },
                          ],
                        },
                        style: {
                          type: "string",
                        },
                        explode: {
                          type: "boolean",
                        },
                        example: {},
                      },
                      required: ["name", "in"],
                      additionalProperties: {},
                    },
                    {
                      type: "object",
                      properties: {
                        $ref: {
                          type: "string",
                        },
                        summary: {
                          type: "string",
                        },
                        description: {
                          type: "string",
                        },
                      },
                      required: ["$ref"],
                      additionalProperties: {},
                    },
                  ],
                },
              },
              requestBody: {
                anyOf: [
                  {
                    type: "object",
                    properties: {
                      description: {
                        type: "string",
                      },
                      content: {
                        type: "object",
                        propertyNames: {
                          type: "string",
                        },
                        additionalProperties: {
                          type: "object",
                          properties: {
                            schema: {
                              anyOf: [
                                {
                                  $ref: "#/$defs/__schema0",
                                },
                                {
                                  type: "object",
                                  properties: {
                                    $ref: {
                                      type: "string",
                                    },
                                    summary: {
                                      type: "string",
                                    },
                                    description: {
                                      type: "string",
                                    },
                                  },
                                  required: ["$ref"],
                                  additionalProperties: {},
                                },
                              ],
                            },
                            example: {},
                            examples: {
                              type: "object",
                              propertyNames: {
                                type: "string",
                              },
                              additionalProperties: {},
                            },
                            encoding: {
                              type: "object",
                              propertyNames: {
                                type: "string",
                              },
                              additionalProperties: {},
                            },
                          },
                          additionalProperties: {},
                        },
                      },
                      required: {
                        type: "boolean",
                      },
                    },
                    required: ["content"],
                    additionalProperties: {},
                  },
                  {
                    type: "object",
                    properties: {
                      $ref: {
                        type: "string",
                      },
                      summary: {
                        type: "string",
                      },
                      description: {
                        type: "string",
                      },
                    },
                    required: ["$ref"],
                    additionalProperties: {},
                  },
                ],
              },
              responses: {
                type: "object",
                propertyNames: {
                  type: "string",
                },
                additionalProperties: {
                  anyOf: [
                    {
                      type: "object",
                      properties: {
                        description: {
                          type: "string",
                        },
                        headers: {
                          type: "object",
                          propertyNames: {
                            type: "string",
                          },
                          additionalProperties: {
                            anyOf: [
                              {
                                type: "object",
                                properties: {
                                  $ref: {
                                    type: "string",
                                  },
                                  summary: {
                                    type: "string",
                                  },
                                  description: {
                                    type: "string",
                                  },
                                },
                                required: ["$ref"],
                                additionalProperties: {},
                              },
                              {},
                            ],
                          },
                        },
                        content: {
                          type: "object",
                          propertyNames: {
                            type: "string",
                          },
                          additionalProperties: {
                            type: "object",
                            properties: {
                              schema: {
                                anyOf: [
                                  {
                                    $ref: "#/$defs/__schema0",
                                  },
                                  {
                                    type: "object",
                                    properties: {
                                      $ref: {
                                        type: "string",
                                      },
                                      summary: {
                                        type: "string",
                                      },
                                      description: {
                                        type: "string",
                                      },
                                    },
                                    required: ["$ref"],
                                    additionalProperties: {},
                                  },
                                ],
                              },
                              example: {},
                              examples: {
                                type: "object",
                                propertyNames: {
                                  type: "string",
                                },
                                additionalProperties: {},
                              },
                              encoding: {
                                type: "object",
                                propertyNames: {
                                  type: "string",
                                },
                                additionalProperties: {},
                              },
                            },
                            additionalProperties: {},
                          },
                        },
                        links: {
                          type: "object",
                          propertyNames: {
                            type: "string",
                          },
                          additionalProperties: {},
                        },
                      },
                      required: ["description"],
                      additionalProperties: {},
                    },
                    {
                      type: "object",
                      properties: {
                        $ref: {
                          type: "string",
                        },
                        summary: {
                          type: "string",
                        },
                        description: {
                          type: "string",
                        },
                      },
                      required: ["$ref"],
                      additionalProperties: {},
                    },
                  ],
                },
              },
              deprecated: {
                type: "boolean",
              },
              security: {
                type: "array",
                items: {
                  type: "object",
                  propertyNames: {
                    type: "string",
                  },
                  additionalProperties: {
                    type: "array",
                    items: {
                      type: "string",
                    },
                  },
                },
              },
              servers: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    url: {
                      type: "string",
                    },
                    description: {
                      type: "string",
                    },
                    variables: {
                      type: "object",
                      propertyNames: {
                        type: "string",
                      },
                      additionalProperties: {
                        type: "object",
                        properties: {
                          enum: {
                            type: "array",
                            items: {
                              type: "string",
                            },
                          },
                          default: {
                            type: "string",
                          },
                          description: {
                            type: "string",
                          },
                        },
                        required: ["default"],
                        additionalProperties: {},
                      },
                    },
                  },
                  required: ["url"],
                  additionalProperties: {},
                },
              },
            },
            required: ["responses"],
            additionalProperties: {},
          },
          delete: {
            type: "object",
            properties: {
              tags: {
                type: "array",
                items: {
                  type: "string",
                },
              },
              summary: {
                type: "string",
              },
              description: {
                type: "string",
              },
              externalDocs: {
                type: "object",
                properties: {
                  description: {
                    type: "string",
                  },
                  url: {
                    type: "string",
                    format: "uri",
                  },
                },
                required: ["url"],
                additionalProperties: {},
              },
              operationId: {
                type: "string",
              },
              parameters: {
                type: "array",
                items: {
                  anyOf: [
                    {
                      type: "object",
                      properties: {
                        name: {
                          type: "string",
                        },
                        in: {
                          type: "string",
                          enum: ["query", "header", "path", "cookie"],
                        },
                        description: {
                          type: "string",
                        },
                        required: {
                          type: "boolean",
                        },
                        deprecated: {
                          type: "boolean",
                        },
                        allowEmptyValue: {
                          type: "boolean",
                        },
                        schema: {
                          anyOf: [
                            {
                              $ref: "#/$defs/__schema0",
                            },
                            {
                              type: "object",
                              properties: {
                                $ref: {
                                  type: "string",
                                },
                                summary: {
                                  type: "string",
                                },
                                description: {
                                  type: "string",
                                },
                              },
                              required: ["$ref"],
                              additionalProperties: {},
                            },
                          ],
                        },
                        style: {
                          type: "string",
                        },
                        explode: {
                          type: "boolean",
                        },
                        example: {},
                      },
                      required: ["name", "in"],
                      additionalProperties: {},
                    },
                    {
                      type: "object",
                      properties: {
                        $ref: {
                          type: "string",
                        },
                        summary: {
                          type: "string",
                        },
                        description: {
                          type: "string",
                        },
                      },
                      required: ["$ref"],
                      additionalProperties: {},
                    },
                  ],
                },
              },
              requestBody: {
                anyOf: [
                  {
                    type: "object",
                    properties: {
                      description: {
                        type: "string",
                      },
                      content: {
                        type: "object",
                        propertyNames: {
                          type: "string",
                        },
                        additionalProperties: {
                          type: "object",
                          properties: {
                            schema: {
                              anyOf: [
                                {
                                  $ref: "#/$defs/__schema0",
                                },
                                {
                                  type: "object",
                                  properties: {
                                    $ref: {
                                      type: "string",
                                    },
                                    summary: {
                                      type: "string",
                                    },
                                    description: {
                                      type: "string",
                                    },
                                  },
                                  required: ["$ref"],
                                  additionalProperties: {},
                                },
                              ],
                            },
                            example: {},
                            examples: {
                              type: "object",
                              propertyNames: {
                                type: "string",
                              },
                              additionalProperties: {},
                            },
                            encoding: {
                              type: "object",
                              propertyNames: {
                                type: "string",
                              },
                              additionalProperties: {},
                            },
                          },
                          additionalProperties: {},
                        },
                      },
                      required: {
                        type: "boolean",
                      },
                    },
                    required: ["content"],
                    additionalProperties: {},
                  },
                  {
                    type: "object",
                    properties: {
                      $ref: {
                        type: "string",
                      },
                      summary: {
                        type: "string",
                      },
                      description: {
                        type: "string",
                      },
                    },
                    required: ["$ref"],
                    additionalProperties: {},
                  },
                ],
              },
              responses: {
                type: "object",
                propertyNames: {
                  type: "string",
                },
                additionalProperties: {
                  anyOf: [
                    {
                      type: "object",
                      properties: {
                        description: {
                          type: "string",
                        },
                        headers: {
                          type: "object",
                          propertyNames: {
                            type: "string",
                          },
                          additionalProperties: {
                            anyOf: [
                              {
                                type: "object",
                                properties: {
                                  $ref: {
                                    type: "string",
                                  },
                                  summary: {
                                    type: "string",
                                  },
                                  description: {
                                    type: "string",
                                  },
                                },
                                required: ["$ref"],
                                additionalProperties: {},
                              },
                              {},
                            ],
                          },
                        },
                        content: {
                          type: "object",
                          propertyNames: {
                            type: "string",
                          },
                          additionalProperties: {
                            type: "object",
                            properties: {
                              schema: {
                                anyOf: [
                                  {
                                    $ref: "#/$defs/__schema0",
                                  },
                                  {
                                    type: "object",
                                    properties: {
                                      $ref: {
                                        type: "string",
                                      },
                                      summary: {
                                        type: "string",
                                      },
                                      description: {
                                        type: "string",
                                      },
                                    },
                                    required: ["$ref"],
                                    additionalProperties: {},
                                  },
                                ],
                              },
                              example: {},
                              examples: {
                                type: "object",
                                propertyNames: {
                                  type: "string",
                                },
                                additionalProperties: {},
                              },
                              encoding: {
                                type: "object",
                                propertyNames: {
                                  type: "string",
                                },
                                additionalProperties: {},
                              },
                            },
                            additionalProperties: {},
                          },
                        },
                        links: {
                          type: "object",
                          propertyNames: {
                            type: "string",
                          },
                          additionalProperties: {},
                        },
                      },
                      required: ["description"],
                      additionalProperties: {},
                    },
                    {
                      type: "object",
                      properties: {
                        $ref: {
                          type: "string",
                        },
                        summary: {
                          type: "string",
                        },
                        description: {
                          type: "string",
                        },
                      },
                      required: ["$ref"],
                      additionalProperties: {},
                    },
                  ],
                },
              },
              deprecated: {
                type: "boolean",
              },
              security: {
                type: "array",
                items: {
                  type: "object",
                  propertyNames: {
                    type: "string",
                  },
                  additionalProperties: {
                    type: "array",
                    items: {
                      type: "string",
                    },
                  },
                },
              },
              servers: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    url: {
                      type: "string",
                    },
                    description: {
                      type: "string",
                    },
                    variables: {
                      type: "object",
                      propertyNames: {
                        type: "string",
                      },
                      additionalProperties: {
                        type: "object",
                        properties: {
                          enum: {
                            type: "array",
                            items: {
                              type: "string",
                            },
                          },
                          default: {
                            type: "string",
                          },
                          description: {
                            type: "string",
                          },
                        },
                        required: ["default"],
                        additionalProperties: {},
                      },
                    },
                  },
                  required: ["url"],
                  additionalProperties: {},
                },
              },
            },
            required: ["responses"],
            additionalProperties: {},
          },
          options: {
            type: "object",
            properties: {
              tags: {
                type: "array",
                items: {
                  type: "string",
                },
              },
              summary: {
                type: "string",
              },
              description: {
                type: "string",
              },
              externalDocs: {
                type: "object",
                properties: {
                  description: {
                    type: "string",
                  },
                  url: {
                    type: "string",
                    format: "uri",
                  },
                },
                required: ["url"],
                additionalProperties: {},
              },
              operationId: {
                type: "string",
              },
              parameters: {
                type: "array",
                items: {
                  anyOf: [
                    {
                      type: "object",
                      properties: {
                        name: {
                          type: "string",
                        },
                        in: {
                          type: "string",
                          enum: ["query", "header", "path", "cookie"],
                        },
                        description: {
                          type: "string",
                        },
                        required: {
                          type: "boolean",
                        },
                        deprecated: {
                          type: "boolean",
                        },
                        allowEmptyValue: {
                          type: "boolean",
                        },
                        schema: {
                          anyOf: [
                            {
                              $ref: "#/$defs/__schema0",
                            },
                            {
                              type: "object",
                              properties: {
                                $ref: {
                                  type: "string",
                                },
                                summary: {
                                  type: "string",
                                },
                                description: {
                                  type: "string",
                                },
                              },
                              required: ["$ref"],
                              additionalProperties: {},
                            },
                          ],
                        },
                        style: {
                          type: "string",
                        },
                        explode: {
                          type: "boolean",
                        },
                        example: {},
                      },
                      required: ["name", "in"],
                      additionalProperties: {},
                    },
                    {
                      type: "object",
                      properties: {
                        $ref: {
                          type: "string",
                        },
                        summary: {
                          type: "string",
                        },
                        description: {
                          type: "string",
                        },
                      },
                      required: ["$ref"],
                      additionalProperties: {},
                    },
                  ],
                },
              },
              requestBody: {
                anyOf: [
                  {
                    type: "object",
                    properties: {
                      description: {
                        type: "string",
                      },
                      content: {
                        type: "object",
                        propertyNames: {
                          type: "string",
                        },
                        additionalProperties: {
                          type: "object",
                          properties: {
                            schema: {
                              anyOf: [
                                {
                                  $ref: "#/$defs/__schema0",
                                },
                                {
                                  type: "object",
                                  properties: {
                                    $ref: {
                                      type: "string",
                                    },
                                    summary: {
                                      type: "string",
                                    },
                                    description: {
                                      type: "string",
                                    },
                                  },
                                  required: ["$ref"],
                                  additionalProperties: {},
                                },
                              ],
                            },
                            example: {},
                            examples: {
                              type: "object",
                              propertyNames: {
                                type: "string",
                              },
                              additionalProperties: {},
                            },
                            encoding: {
                              type: "object",
                              propertyNames: {
                                type: "string",
                              },
                              additionalProperties: {},
                            },
                          },
                          additionalProperties: {},
                        },
                      },
                      required: {
                        type: "boolean",
                      },
                    },
                    required: ["content"],
                    additionalProperties: {},
                  },
                  {
                    type: "object",
                    properties: {
                      $ref: {
                        type: "string",
                      },
                      summary: {
                        type: "string",
                      },
                      description: {
                        type: "string",
                      },
                    },
                    required: ["$ref"],
                    additionalProperties: {},
                  },
                ],
              },
              responses: {
                type: "object",
                propertyNames: {
                  type: "string",
                },
                additionalProperties: {
                  anyOf: [
                    {
                      type: "object",
                      properties: {
                        description: {
                          type: "string",
                        },
                        headers: {
                          type: "object",
                          propertyNames: {
                            type: "string",
                          },
                          additionalProperties: {
                            anyOf: [
                              {
                                type: "object",
                                properties: {
                                  $ref: {
                                    type: "string",
                                  },
                                  summary: {
                                    type: "string",
                                  },
                                  description: {
                                    type: "string",
                                  },
                                },
                                required: ["$ref"],
                                additionalProperties: {},
                              },
                              {},
                            ],
                          },
                        },
                        content: {
                          type: "object",
                          propertyNames: {
                            type: "string",
                          },
                          additionalProperties: {
                            type: "object",
                            properties: {
                              schema: {
                                anyOf: [
                                  {
                                    $ref: "#/$defs/__schema0",
                                  },
                                  {
                                    type: "object",
                                    properties: {
                                      $ref: {
                                        type: "string",
                                      },
                                      summary: {
                                        type: "string",
                                      },
                                      description: {
                                        type: "string",
                                      },
                                    },
                                    required: ["$ref"],
                                    additionalProperties: {},
                                  },
                                ],
                              },
                              example: {},
                              examples: {
                                type: "object",
                                propertyNames: {
                                  type: "string",
                                },
                                additionalProperties: {},
                              },
                              encoding: {
                                type: "object",
                                propertyNames: {
                                  type: "string",
                                },
                                additionalProperties: {},
                              },
                            },
                            additionalProperties: {},
                          },
                        },
                        links: {
                          type: "object",
                          propertyNames: {
                            type: "string",
                          },
                          additionalProperties: {},
                        },
                      },
                      required: ["description"],
                      additionalProperties: {},
                    },
                    {
                      type: "object",
                      properties: {
                        $ref: {
                          type: "string",
                        },
                        summary: {
                          type: "string",
                        },
                        description: {
                          type: "string",
                        },
                      },
                      required: ["$ref"],
                      additionalProperties: {},
                    },
                  ],
                },
              },
              deprecated: {
                type: "boolean",
              },
              security: {
                type: "array",
                items: {
                  type: "object",
                  propertyNames: {
                    type: "string",
                  },
                  additionalProperties: {
                    type: "array",
                    items: {
                      type: "string",
                    },
                  },
                },
              },
              servers: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    url: {
                      type: "string",
                    },
                    description: {
                      type: "string",
                    },
                    variables: {
                      type: "object",
                      propertyNames: {
                        type: "string",
                      },
                      additionalProperties: {
                        type: "object",
                        properties: {
                          enum: {
                            type: "array",
                            items: {
                              type: "string",
                            },
                          },
                          default: {
                            type: "string",
                          },
                          description: {
                            type: "string",
                          },
                        },
                        required: ["default"],
                        additionalProperties: {},
                      },
                    },
                  },
                  required: ["url"],
                  additionalProperties: {},
                },
              },
            },
            required: ["responses"],
            additionalProperties: {},
          },
          head: {
            type: "object",
            properties: {
              tags: {
                type: "array",
                items: {
                  type: "string",
                },
              },
              summary: {
                type: "string",
              },
              description: {
                type: "string",
              },
              externalDocs: {
                type: "object",
                properties: {
                  description: {
                    type: "string",
                  },
                  url: {
                    type: "string",
                    format: "uri",
                  },
                },
                required: ["url"],
                additionalProperties: {},
              },
              operationId: {
                type: "string",
              },
              parameters: {
                type: "array",
                items: {
                  anyOf: [
                    {
                      type: "object",
                      properties: {
                        name: {
                          type: "string",
                        },
                        in: {
                          type: "string",
                          enum: ["query", "header", "path", "cookie"],
                        },
                        description: {
                          type: "string",
                        },
                        required: {
                          type: "boolean",
                        },
                        deprecated: {
                          type: "boolean",
                        },
                        allowEmptyValue: {
                          type: "boolean",
                        },
                        schema: {
                          anyOf: [
                            {
                              $ref: "#/$defs/__schema0",
                            },
                            {
                              type: "object",
                              properties: {
                                $ref: {
                                  type: "string",
                                },
                                summary: {
                                  type: "string",
                                },
                                description: {
                                  type: "string",
                                },
                              },
                              required: ["$ref"],
                              additionalProperties: {},
                            },
                          ],
                        },
                        style: {
                          type: "string",
                        },
                        explode: {
                          type: "boolean",
                        },
                        example: {},
                      },
                      required: ["name", "in"],
                      additionalProperties: {},
                    },
                    {
                      type: "object",
                      properties: {
                        $ref: {
                          type: "string",
                        },
                        summary: {
                          type: "string",
                        },
                        description: {
                          type: "string",
                        },
                      },
                      required: ["$ref"],
                      additionalProperties: {},
                    },
                  ],
                },
              },
              requestBody: {
                anyOf: [
                  {
                    type: "object",
                    properties: {
                      description: {
                        type: "string",
                      },
                      content: {
                        type: "object",
                        propertyNames: {
                          type: "string",
                        },
                        additionalProperties: {
                          type: "object",
                          properties: {
                            schema: {
                              anyOf: [
                                {
                                  $ref: "#/$defs/__schema0",
                                },
                                {
                                  type: "object",
                                  properties: {
                                    $ref: {
                                      type: "string",
                                    },
                                    summary: {
                                      type: "string",
                                    },
                                    description: {
                                      type: "string",
                                    },
                                  },
                                  required: ["$ref"],
                                  additionalProperties: {},
                                },
                              ],
                            },
                            example: {},
                            examples: {
                              type: "object",
                              propertyNames: {
                                type: "string",
                              },
                              additionalProperties: {},
                            },
                            encoding: {
                              type: "object",
                              propertyNames: {
                                type: "string",
                              },
                              additionalProperties: {},
                            },
                          },
                          additionalProperties: {},
                        },
                      },
                      required: {
                        type: "boolean",
                      },
                    },
                    required: ["content"],
                    additionalProperties: {},
                  },
                  {
                    type: "object",
                    properties: {
                      $ref: {
                        type: "string",
                      },
                      summary: {
                        type: "string",
                      },
                      description: {
                        type: "string",
                      },
                    },
                    required: ["$ref"],
                    additionalProperties: {},
                  },
                ],
              },
              responses: {
                type: "object",
                propertyNames: {
                  type: "string",
                },
                additionalProperties: {
                  anyOf: [
                    {
                      type: "object",
                      properties: {
                        description: {
                          type: "string",
                        },
                        headers: {
                          type: "object",
                          propertyNames: {
                            type: "string",
                          },
                          additionalProperties: {
                            anyOf: [
                              {
                                type: "object",
                                properties: {
                                  $ref: {
                                    type: "string",
                                  },
                                  summary: {
                                    type: "string",
                                  },
                                  description: {
                                    type: "string",
                                  },
                                },
                                required: ["$ref"],
                                additionalProperties: {},
                              },
                              {},
                            ],
                          },
                        },
                        content: {
                          type: "object",
                          propertyNames: {
                            type: "string",
                          },
                          additionalProperties: {
                            type: "object",
                            properties: {
                              schema: {
                                anyOf: [
                                  {
                                    $ref: "#/$defs/__schema0",
                                  },
                                  {
                                    type: "object",
                                    properties: {
                                      $ref: {
                                        type: "string",
                                      },
                                      summary: {
                                        type: "string",
                                      },
                                      description: {
                                        type: "string",
                                      },
                                    },
                                    required: ["$ref"],
                                    additionalProperties: {},
                                  },
                                ],
                              },
                              example: {},
                              examples: {
                                type: "object",
                                propertyNames: {
                                  type: "string",
                                },
                                additionalProperties: {},
                              },
                              encoding: {
                                type: "object",
                                propertyNames: {
                                  type: "string",
                                },
                                additionalProperties: {},
                              },
                            },
                            additionalProperties: {},
                          },
                        },
                        links: {
                          type: "object",
                          propertyNames: {
                            type: "string",
                          },
                          additionalProperties: {},
                        },
                      },
                      required: ["description"],
                      additionalProperties: {},
                    },
                    {
                      type: "object",
                      properties: {
                        $ref: {
                          type: "string",
                        },
                        summary: {
                          type: "string",
                        },
                        description: {
                          type: "string",
                        },
                      },
                      required: ["$ref"],
                      additionalProperties: {},
                    },
                  ],
                },
              },
              deprecated: {
                type: "boolean",
              },
              security: {
                type: "array",
                items: {
                  type: "object",
                  propertyNames: {
                    type: "string",
                  },
                  additionalProperties: {
                    type: "array",
                    items: {
                      type: "string",
                    },
                  },
                },
              },
              servers: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    url: {
                      type: "string",
                    },
                    description: {
                      type: "string",
                    },
                    variables: {
                      type: "object",
                      propertyNames: {
                        type: "string",
                      },
                      additionalProperties: {
                        type: "object",
                        properties: {
                          enum: {
                            type: "array",
                            items: {
                              type: "string",
                            },
                          },
                          default: {
                            type: "string",
                          },
                          description: {
                            type: "string",
                          },
                        },
                        required: ["default"],
                        additionalProperties: {},
                      },
                    },
                  },
                  required: ["url"],
                  additionalProperties: {},
                },
              },
            },
            required: ["responses"],
            additionalProperties: {},
          },
          patch: {
            type: "object",
            properties: {
              tags: {
                type: "array",
                items: {
                  type: "string",
                },
              },
              summary: {
                type: "string",
              },
              description: {
                type: "string",
              },
              externalDocs: {
                type: "object",
                properties: {
                  description: {
                    type: "string",
                  },
                  url: {
                    type: "string",
                    format: "uri",
                  },
                },
                required: ["url"],
                additionalProperties: {},
              },
              operationId: {
                type: "string",
              },
              parameters: {
                type: "array",
                items: {
                  anyOf: [
                    {
                      type: "object",
                      properties: {
                        name: {
                          type: "string",
                        },
                        in: {
                          type: "string",
                          enum: ["query", "header", "path", "cookie"],
                        },
                        description: {
                          type: "string",
                        },
                        required: {
                          type: "boolean",
                        },
                        deprecated: {
                          type: "boolean",
                        },
                        allowEmptyValue: {
                          type: "boolean",
                        },
                        schema: {
                          anyOf: [
                            {
                              $ref: "#/$defs/__schema0",
                            },
                            {
                              type: "object",
                              properties: {
                                $ref: {
                                  type: "string",
                                },
                                summary: {
                                  type: "string",
                                },
                                description: {
                                  type: "string",
                                },
                              },
                              required: ["$ref"],
                              additionalProperties: {},
                            },
                          ],
                        },
                        style: {
                          type: "string",
                        },
                        explode: {
                          type: "boolean",
                        },
                        example: {},
                      },
                      required: ["name", "in"],
                      additionalProperties: {},
                    },
                    {
                      type: "object",
                      properties: {
                        $ref: {
                          type: "string",
                        },
                        summary: {
                          type: "string",
                        },
                        description: {
                          type: "string",
                        },
                      },
                      required: ["$ref"],
                      additionalProperties: {},
                    },
                  ],
                },
              },
              requestBody: {
                anyOf: [
                  {
                    type: "object",
                    properties: {
                      description: {
                        type: "string",
                      },
                      content: {
                        type: "object",
                        propertyNames: {
                          type: "string",
                        },
                        additionalProperties: {
                          type: "object",
                          properties: {
                            schema: {
                              anyOf: [
                                {
                                  $ref: "#/$defs/__schema0",
                                },
                                {
                                  type: "object",
                                  properties: {
                                    $ref: {
                                      type: "string",
                                    },
                                    summary: {
                                      type: "string",
                                    },
                                    description: {
                                      type: "string",
                                    },
                                  },
                                  required: ["$ref"],
                                  additionalProperties: {},
                                },
                              ],
                            },
                            example: {},
                            examples: {
                              type: "object",
                              propertyNames: {
                                type: "string",
                              },
                              additionalProperties: {},
                            },
                            encoding: {
                              type: "object",
                              propertyNames: {
                                type: "string",
                              },
                              additionalProperties: {},
                            },
                          },
                          additionalProperties: {},
                        },
                      },
                      required: {
                        type: "boolean",
                      },
                    },
                    required: ["content"],
                    additionalProperties: {},
                  },
                  {
                    type: "object",
                    properties: {
                      $ref: {
                        type: "string",
                      },
                      summary: {
                        type: "string",
                      },
                      description: {
                        type: "string",
                      },
                    },
                    required: ["$ref"],
                    additionalProperties: {},
                  },
                ],
              },
              responses: {
                type: "object",
                propertyNames: {
                  type: "string",
                },
                additionalProperties: {
                  anyOf: [
                    {
                      type: "object",
                      properties: {
                        description: {
                          type: "string",
                        },
                        headers: {
                          type: "object",
                          propertyNames: {
                            type: "string",
                          },
                          additionalProperties: {
                            anyOf: [
                              {
                                type: "object",
                                properties: {
                                  $ref: {
                                    type: "string",
                                  },
                                  summary: {
                                    type: "string",
                                  },
                                  description: {
                                    type: "string",
                                  },
                                },
                                required: ["$ref"],
                                additionalProperties: {},
                              },
                              {},
                            ],
                          },
                        },
                        content: {
                          type: "object",
                          propertyNames: {
                            type: "string",
                          },
                          additionalProperties: {
                            type: "object",
                            properties: {
                              schema: {
                                anyOf: [
                                  {
                                    $ref: "#/$defs/__schema0",
                                  },
                                  {
                                    type: "object",
                                    properties: {
                                      $ref: {
                                        type: "string",
                                      },
                                      summary: {
                                        type: "string",
                                      },
                                      description: {
                                        type: "string",
                                      },
                                    },
                                    required: ["$ref"],
                                    additionalProperties: {},
                                  },
                                ],
                              },
                              example: {},
                              examples: {
                                type: "object",
                                propertyNames: {
                                  type: "string",
                                },
                                additionalProperties: {},
                              },
                              encoding: {
                                type: "object",
                                propertyNames: {
                                  type: "string",
                                },
                                additionalProperties: {},
                              },
                            },
                            additionalProperties: {},
                          },
                        },
                        links: {
                          type: "object",
                          propertyNames: {
                            type: "string",
                          },
                          additionalProperties: {},
                        },
                      },
                      required: ["description"],
                      additionalProperties: {},
                    },
                    {
                      type: "object",
                      properties: {
                        $ref: {
                          type: "string",
                        },
                        summary: {
                          type: "string",
                        },
                        description: {
                          type: "string",
                        },
                      },
                      required: ["$ref"],
                      additionalProperties: {},
                    },
                  ],
                },
              },
              deprecated: {
                type: "boolean",
              },
              security: {
                type: "array",
                items: {
                  type: "object",
                  propertyNames: {
                    type: "string",
                  },
                  additionalProperties: {
                    type: "array",
                    items: {
                      type: "string",
                    },
                  },
                },
              },
              servers: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    url: {
                      type: "string",
                    },
                    description: {
                      type: "string",
                    },
                    variables: {
                      type: "object",
                      propertyNames: {
                        type: "string",
                      },
                      additionalProperties: {
                        type: "object",
                        properties: {
                          enum: {
                            type: "array",
                            items: {
                              type: "string",
                            },
                          },
                          default: {
                            type: "string",
                          },
                          description: {
                            type: "string",
                          },
                        },
                        required: ["default"],
                        additionalProperties: {},
                      },
                    },
                  },
                  required: ["url"],
                  additionalProperties: {},
                },
              },
            },
            required: ["responses"],
            additionalProperties: {},
          },
          trace: {
            type: "object",
            properties: {
              tags: {
                type: "array",
                items: {
                  type: "string",
                },
              },
              summary: {
                type: "string",
              },
              description: {
                type: "string",
              },
              externalDocs: {
                type: "object",
                properties: {
                  description: {
                    type: "string",
                  },
                  url: {
                    type: "string",
                    format: "uri",
                  },
                },
                required: ["url"],
                additionalProperties: {},
              },
              operationId: {
                type: "string",
              },
              parameters: {
                type: "array",
                items: {
                  anyOf: [
                    {
                      type: "object",
                      properties: {
                        name: {
                          type: "string",
                        },
                        in: {
                          type: "string",
                          enum: ["query", "header", "path", "cookie"],
                        },
                        description: {
                          type: "string",
                        },
                        required: {
                          type: "boolean",
                        },
                        deprecated: {
                          type: "boolean",
                        },
                        allowEmptyValue: {
                          type: "boolean",
                        },
                        schema: {
                          anyOf: [
                            {
                              $ref: "#/$defs/__schema0",
                            },
                            {
                              type: "object",
                              properties: {
                                $ref: {
                                  type: "string",
                                },
                                summary: {
                                  type: "string",
                                },
                                description: {
                                  type: "string",
                                },
                              },
                              required: ["$ref"],
                              additionalProperties: {},
                            },
                          ],
                        },
                        style: {
                          type: "string",
                        },
                        explode: {
                          type: "boolean",
                        },
                        example: {},
                      },
                      required: ["name", "in"],
                      additionalProperties: {},
                    },
                    {
                      type: "object",
                      properties: {
                        $ref: {
                          type: "string",
                        },
                        summary: {
                          type: "string",
                        },
                        description: {
                          type: "string",
                        },
                      },
                      required: ["$ref"],
                      additionalProperties: {},
                    },
                  ],
                },
              },
              requestBody: {
                anyOf: [
                  {
                    type: "object",
                    properties: {
                      description: {
                        type: "string",
                      },
                      content: {
                        type: "object",
                        propertyNames: {
                          type: "string",
                        },
                        additionalProperties: {
                          type: "object",
                          properties: {
                            schema: {
                              anyOf: [
                                {
                                  $ref: "#/$defs/__schema0",
                                },
                                {
                                  type: "object",
                                  properties: {
                                    $ref: {
                                      type: "string",
                                    },
                                    summary: {
                                      type: "string",
                                    },
                                    description: {
                                      type: "string",
                                    },
                                  },
                                  required: ["$ref"],
                                  additionalProperties: {},
                                },
                              ],
                            },
                            example: {},
                            examples: {
                              type: "object",
                              propertyNames: {
                                type: "string",
                              },
                              additionalProperties: {},
                            },
                            encoding: {
                              type: "object",
                              propertyNames: {
                                type: "string",
                              },
                              additionalProperties: {},
                            },
                          },
                          additionalProperties: {},
                        },
                      },
                      required: {
                        type: "boolean",
                      },
                    },
                    required: ["content"],
                    additionalProperties: {},
                  },
                  {
                    type: "object",
                    properties: {
                      $ref: {
                        type: "string",
                      },
                      summary: {
                        type: "string",
                      },
                      description: {
                        type: "string",
                      },
                    },
                    required: ["$ref"],
                    additionalProperties: {},
                  },
                ],
              },
              responses: {
                type: "object",
                propertyNames: {
                  type: "string",
                },
                additionalProperties: {
                  anyOf: [
                    {
                      type: "object",
                      properties: {
                        description: {
                          type: "string",
                        },
                        headers: {
                          type: "object",
                          propertyNames: {
                            type: "string",
                          },
                          additionalProperties: {
                            anyOf: [
                              {
                                type: "object",
                                properties: {
                                  $ref: {
                                    type: "string",
                                  },
                                  summary: {
                                    type: "string",
                                  },
                                  description: {
                                    type: "string",
                                  },
                                },
                                required: ["$ref"],
                                additionalProperties: {},
                              },
                              {},
                            ],
                          },
                        },
                        content: {
                          type: "object",
                          propertyNames: {
                            type: "string",
                          },
                          additionalProperties: {
                            type: "object",
                            properties: {
                              schema: {
                                anyOf: [
                                  {
                                    $ref: "#/$defs/__schema0",
                                  },
                                  {
                                    type: "object",
                                    properties: {
                                      $ref: {
                                        type: "string",
                                      },
                                      summary: {
                                        type: "string",
                                      },
                                      description: {
                                        type: "string",
                                      },
                                    },
                                    required: ["$ref"],
                                    additionalProperties: {},
                                  },
                                ],
                              },
                              example: {},
                              examples: {
                                type: "object",
                                propertyNames: {
                                  type: "string",
                                },
                                additionalProperties: {},
                              },
                              encoding: {
                                type: "object",
                                propertyNames: {
                                  type: "string",
                                },
                                additionalProperties: {},
                              },
                            },
                            additionalProperties: {},
                          },
                        },
                        links: {
                          type: "object",
                          propertyNames: {
                            type: "string",
                          },
                          additionalProperties: {},
                        },
                      },
                      required: ["description"],
                      additionalProperties: {},
                    },
                    {
                      type: "object",
                      properties: {
                        $ref: {
                          type: "string",
                        },
                        summary: {
                          type: "string",
                        },
                        description: {
                          type: "string",
                        },
                      },
                      required: ["$ref"],
                      additionalProperties: {},
                    },
                  ],
                },
              },
              deprecated: {
                type: "boolean",
              },
              security: {
                type: "array",
                items: {
                  type: "object",
                  propertyNames: {
                    type: "string",
                  },
                  additionalProperties: {
                    type: "array",
                    items: {
                      type: "string",
                    },
                  },
                },
              },
              servers: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    url: {
                      type: "string",
                    },
                    description: {
                      type: "string",
                    },
                    variables: {
                      type: "object",
                      propertyNames: {
                        type: "string",
                      },
                      additionalProperties: {
                        type: "object",
                        properties: {
                          enum: {
                            type: "array",
                            items: {
                              type: "string",
                            },
                          },
                          default: {
                            type: "string",
                          },
                          description: {
                            type: "string",
                          },
                        },
                        required: ["default"],
                        additionalProperties: {},
                      },
                    },
                  },
                  required: ["url"],
                  additionalProperties: {},
                },
              },
            },
            required: ["responses"],
            additionalProperties: {},
          },
          servers: {
            type: "array",
            items: {
              type: "object",
              properties: {
                url: {
                  type: "string",
                },
                description: {
                  type: "string",
                },
                variables: {
                  type: "object",
                  propertyNames: {
                    type: "string",
                  },
                  additionalProperties: {
                    type: "object",
                    properties: {
                      enum: {
                        type: "array",
                        items: {
                          type: "string",
                        },
                      },
                      default: {
                        type: "string",
                      },
                      description: {
                        type: "string",
                      },
                    },
                    required: ["default"],
                    additionalProperties: {},
                  },
                },
              },
              required: ["url"],
              additionalProperties: {},
            },
          },
          parameters: {
            type: "array",
            items: {
              anyOf: [
                {
                  type: "object",
                  properties: {
                    name: {
                      type: "string",
                    },
                    in: {
                      type: "string",
                      enum: ["query", "header", "path", "cookie"],
                    },
                    description: {
                      type: "string",
                    },
                    required: {
                      type: "boolean",
                    },
                    deprecated: {
                      type: "boolean",
                    },
                    allowEmptyValue: {
                      type: "boolean",
                    },
                    schema: {
                      anyOf: [
                        {
                          $ref: "#/$defs/__schema0",
                        },
                        {
                          type: "object",
                          properties: {
                            $ref: {
                              type: "string",
                            },
                            summary: {
                              type: "string",
                            },
                            description: {
                              type: "string",
                            },
                          },
                          required: ["$ref"],
                          additionalProperties: {},
                        },
                      ],
                    },
                    style: {
                      type: "string",
                    },
                    explode: {
                      type: "boolean",
                    },
                    example: {},
                  },
                  required: ["name", "in"],
                  additionalProperties: {},
                },
                {
                  type: "object",
                  properties: {
                    $ref: {
                      type: "string",
                    },
                    summary: {
                      type: "string",
                    },
                    description: {
                      type: "string",
                    },
                  },
                  required: ["$ref"],
                  additionalProperties: {},
                },
              ],
            },
          },
        },
        additionalProperties: {},
      },
    },
    components: {
      type: "object",
      properties: {
        schemas: {
          type: "object",
          propertyNames: {
            type: "string",
          },
          additionalProperties: {
            anyOf: [
              {
                $ref: "#/$defs/__schema0",
              },
              {
                type: "object",
                properties: {
                  $ref: {
                    type: "string",
                  },
                  summary: {
                    type: "string",
                  },
                  description: {
                    type: "string",
                  },
                },
                required: ["$ref"],
                additionalProperties: {},
              },
            ],
          },
        },
        responses: {
          type: "object",
          propertyNames: {
            type: "string",
          },
          additionalProperties: {
            anyOf: [
              {
                type: "object",
                properties: {
                  description: {
                    type: "string",
                  },
                  headers: {
                    type: "object",
                    propertyNames: {
                      type: "string",
                    },
                    additionalProperties: {
                      anyOf: [
                        {
                          type: "object",
                          properties: {
                            $ref: {
                              type: "string",
                            },
                            summary: {
                              type: "string",
                            },
                            description: {
                              type: "string",
                            },
                          },
                          required: ["$ref"],
                          additionalProperties: {},
                        },
                        {},
                      ],
                    },
                  },
                  content: {
                    type: "object",
                    propertyNames: {
                      type: "string",
                    },
                    additionalProperties: {
                      type: "object",
                      properties: {
                        schema: {
                          anyOf: [
                            {
                              $ref: "#/$defs/__schema0",
                            },
                            {
                              type: "object",
                              properties: {
                                $ref: {
                                  type: "string",
                                },
                                summary: {
                                  type: "string",
                                },
                                description: {
                                  type: "string",
                                },
                              },
                              required: ["$ref"],
                              additionalProperties: {},
                            },
                          ],
                        },
                        example: {},
                        examples: {
                          type: "object",
                          propertyNames: {
                            type: "string",
                          },
                          additionalProperties: {},
                        },
                        encoding: {
                          type: "object",
                          propertyNames: {
                            type: "string",
                          },
                          additionalProperties: {},
                        },
                      },
                      additionalProperties: {},
                    },
                  },
                  links: {
                    type: "object",
                    propertyNames: {
                      type: "string",
                    },
                    additionalProperties: {},
                  },
                },
                required: ["description"],
                additionalProperties: {},
              },
              {
                type: "object",
                properties: {
                  $ref: {
                    type: "string",
                  },
                  summary: {
                    type: "string",
                  },
                  description: {
                    type: "string",
                  },
                },
                required: ["$ref"],
                additionalProperties: {},
              },
            ],
          },
        },
        parameters: {
          type: "object",
          propertyNames: {
            type: "string",
          },
          additionalProperties: {
            anyOf: [
              {
                type: "object",
                properties: {
                  name: {
                    type: "string",
                  },
                  in: {
                    type: "string",
                    enum: ["query", "header", "path", "cookie"],
                  },
                  description: {
                    type: "string",
                  },
                  required: {
                    type: "boolean",
                  },
                  deprecated: {
                    type: "boolean",
                  },
                  allowEmptyValue: {
                    type: "boolean",
                  },
                  schema: {
                    anyOf: [
                      {
                        $ref: "#/$defs/__schema0",
                      },
                      {
                        type: "object",
                        properties: {
                          $ref: {
                            type: "string",
                          },
                          summary: {
                            type: "string",
                          },
                          description: {
                            type: "string",
                          },
                        },
                        required: ["$ref"],
                        additionalProperties: {},
                      },
                    ],
                  },
                  style: {
                    type: "string",
                  },
                  explode: {
                    type: "boolean",
                  },
                  example: {},
                },
                required: ["name", "in"],
                additionalProperties: {},
              },
              {
                type: "object",
                properties: {
                  $ref: {
                    type: "string",
                  },
                  summary: {
                    type: "string",
                  },
                  description: {
                    type: "string",
                  },
                },
                required: ["$ref"],
                additionalProperties: {},
              },
            ],
          },
        },
        examples: {
          type: "object",
          propertyNames: {
            type: "string",
          },
          additionalProperties: {
            anyOf: [
              {},
              {
                type: "object",
                properties: {
                  $ref: {
                    type: "string",
                  },
                  summary: {
                    type: "string",
                  },
                  description: {
                    type: "string",
                  },
                },
                required: ["$ref"],
                additionalProperties: {},
              },
            ],
          },
        },
        requestBodies: {
          type: "object",
          propertyNames: {
            type: "string",
          },
          additionalProperties: {
            anyOf: [
              {
                type: "object",
                properties: {
                  description: {
                    type: "string",
                  },
                  content: {
                    type: "object",
                    propertyNames: {
                      type: "string",
                    },
                    additionalProperties: {
                      type: "object",
                      properties: {
                        schema: {
                          anyOf: [
                            {
                              $ref: "#/$defs/__schema0",
                            },
                            {
                              type: "object",
                              properties: {
                                $ref: {
                                  type: "string",
                                },
                                summary: {
                                  type: "string",
                                },
                                description: {
                                  type: "string",
                                },
                              },
                              required: ["$ref"],
                              additionalProperties: {},
                            },
                          ],
                        },
                        example: {},
                        examples: {
                          type: "object",
                          propertyNames: {
                            type: "string",
                          },
                          additionalProperties: {},
                        },
                        encoding: {
                          type: "object",
                          propertyNames: {
                            type: "string",
                          },
                          additionalProperties: {},
                        },
                      },
                      additionalProperties: {},
                    },
                  },
                  required: {
                    type: "boolean",
                  },
                },
                required: ["content"],
                additionalProperties: {},
              },
              {
                type: "object",
                properties: {
                  $ref: {
                    type: "string",
                  },
                  summary: {
                    type: "string",
                  },
                  description: {
                    type: "string",
                  },
                },
                required: ["$ref"],
                additionalProperties: {},
              },
            ],
          },
        },
        headers: {
          type: "object",
          propertyNames: {
            type: "string",
          },
          additionalProperties: {
            anyOf: [
              {},
              {
                type: "object",
                properties: {
                  $ref: {
                    type: "string",
                  },
                  summary: {
                    type: "string",
                  },
                  description: {
                    type: "string",
                  },
                },
                required: ["$ref"],
                additionalProperties: {},
              },
            ],
          },
        },
        securitySchemes: {
          type: "object",
          propertyNames: {
            type: "string",
          },
          additionalProperties: {
            anyOf: [
              {},
              {
                type: "object",
                properties: {
                  $ref: {
                    type: "string",
                  },
                  summary: {
                    type: "string",
                  },
                  description: {
                    type: "string",
                  },
                },
                required: ["$ref"],
                additionalProperties: {},
              },
            ],
          },
        },
        links: {
          type: "object",
          propertyNames: {
            type: "string",
          },
          additionalProperties: {
            anyOf: [
              {},
              {
                type: "object",
                properties: {
                  $ref: {
                    type: "string",
                  },
                  summary: {
                    type: "string",
                  },
                  description: {
                    type: "string",
                  },
                },
                required: ["$ref"],
                additionalProperties: {},
              },
            ],
          },
        },
        callbacks: {
          type: "object",
          propertyNames: {
            type: "string",
          },
          additionalProperties: {
            anyOf: [
              {},
              {
                type: "object",
                properties: {
                  $ref: {
                    type: "string",
                  },
                  summary: {
                    type: "string",
                  },
                  description: {
                    type: "string",
                  },
                },
                required: ["$ref"],
                additionalProperties: {},
              },
            ],
          },
        },
      },
      additionalProperties: {},
    },
    security: {
      type: "array",
      items: {
        type: "object",
        propertyNames: {
          type: "string",
        },
        additionalProperties: {
          type: "array",
          items: {
            type: "string",
          },
        },
      },
    },
    tags: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: {
            type: "string",
          },
          description: {
            type: "string",
          },
          externalDocs: {
            type: "object",
            properties: {
              description: {
                type: "string",
              },
              url: {
                type: "string",
                format: "uri",
              },
            },
            required: ["url"],
            additionalProperties: {},
          },
        },
        required: ["name"],
        additionalProperties: {},
      },
    },
    externalDocs: {
      type: "object",
      properties: {
        description: {
          type: "string",
        },
        url: {
          type: "string",
          format: "uri",
        },
      },
      required: ["url"],
      additionalProperties: {},
    },
  },
  required: ["openapi", "info", "paths"],
  additionalProperties: {},
  $defs: {
    __schema0: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: [
            "string",
            "number",
            "integer",
            "boolean",
            "array",
            "object",
            "null",
          ],
        },
        format: {
          type: "string",
        },
        pattern: {
          type: "string",
        },
        properties: {
          type: "object",
          propertyNames: {
            type: "string",
          },
          additionalProperties: {
            anyOf: [
              {
                $ref: "#/$defs/__schema0",
              },
              {
                type: "object",
                properties: {
                  $ref: {
                    type: "string",
                  },
                  summary: {
                    type: "string",
                  },
                  description: {
                    type: "string",
                  },
                },
                required: ["$ref"],
                additionalProperties: {},
              },
            ],
          },
        },
        additionalProperties: {
          anyOf: [
            {
              type: "boolean",
            },
            {
              $ref: "#/$defs/__schema0",
            },
            {
              type: "object",
              properties: {
                $ref: {
                  type: "string",
                },
                summary: {
                  type: "string",
                },
                description: {
                  type: "string",
                },
              },
              required: ["$ref"],
              additionalProperties: {},
            },
          ],
        },
        items: {
          anyOf: [
            {
              $ref: "#/$defs/__schema0",
            },
            {
              type: "object",
              properties: {
                $ref: {
                  type: "string",
                },
                summary: {
                  type: "string",
                },
                description: {
                  type: "string",
                },
              },
              required: ["$ref"],
              additionalProperties: {},
            },
          ],
        },
        required: {
          type: "array",
          items: {
            type: "string",
          },
        },
        allOf: {
          type: "array",
          items: {
            anyOf: [
              {
                $ref: "#/$defs/__schema0",
              },
              {
                type: "object",
                properties: {
                  $ref: {
                    type: "string",
                  },
                  summary: {
                    type: "string",
                  },
                  description: {
                    type: "string",
                  },
                },
                required: ["$ref"],
                additionalProperties: {},
              },
            ],
          },
        },
        oneOf: {
          type: "array",
          items: {
            anyOf: [
              {
                $ref: "#/$defs/__schema0",
              },
              {
                type: "object",
                properties: {
                  $ref: {
                    type: "string",
                  },
                  summary: {
                    type: "string",
                  },
                  description: {
                    type: "string",
                  },
                },
                required: ["$ref"],
                additionalProperties: {},
              },
            ],
          },
        },
        anyOf: {
          type: "array",
          items: {
            anyOf: [
              {
                $ref: "#/$defs/__schema0",
              },
              {
                type: "object",
                properties: {
                  $ref: {
                    type: "string",
                  },
                  summary: {
                    type: "string",
                  },
                  description: {
                    type: "string",
                  },
                },
                required: ["$ref"],
                additionalProperties: {},
              },
            ],
          },
        },
        not: {
          anyOf: [
            {
              $ref: "#/$defs/__schema0",
            },
            {
              type: "object",
              properties: {
                $ref: {
                  type: "string",
                },
                summary: {
                  type: "string",
                },
                description: {
                  type: "string",
                },
              },
              required: ["$ref"],
              additionalProperties: {},
            },
          ],
        },
        title: {
          type: "string",
        },
        description: {
          type: "string",
        },
        default: {},
        example: {},
        enum: {
          type: "array",
          items: {},
        },
        const: {},
        nullable: {
          type: "boolean",
        },
        readOnly: {
          type: "boolean",
        },
        writeOnly: {
          type: "boolean",
        },
        deprecated: {
          type: "boolean",
        },
        $schema: {
          type: "string",
        },
      },
      additionalProperties: {},
    },
  },
} as OpenAPIV3.SchemaObject;
