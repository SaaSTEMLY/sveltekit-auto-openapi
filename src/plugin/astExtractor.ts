import { Project, SourceFile, FunctionDeclaration, VariableDeclaration, SyntaxKind, Type, Symbol as TsSymbol } from "ts-morph";
import type { OpenAPIV3 } from "openapi-types";
import path from "path";

const HTTP_METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"];

interface MethodInfo {
  name: string;
  declaration: FunctionDeclaration | VariableDeclaration;
}

export class AstSchemaExtractor {
  private project: Project;
  private debugLog: (...args: any[]) => void;

  constructor(debugLog?: (...args: any[]) => void) {
    this.project = new Project({
      skipAddingFilesFromTsConfig: true,
      compilerOptions: {
        allowJs: true,
        checkJs: false,
      },
    });
    this.debugLog = debugLog || (() => {});
  }

  async extractFromFile(
    filePath: string,
    configuredMethods: string[] = []
  ): Promise<OpenAPIV3.PathItemObject | null> {
    try {
      this.debugLog("[AST] Analyzing file:", filePath);

      const sourceFile = this.project.addSourceFileAtPath(
        path.resolve(process.cwd(), filePath)
      );

      // Find HTTP method exports
      const methods = this.findHttpMethods(sourceFile, configuredMethods);
      this.debugLog("[AST] Found methods:", methods.map((m) => m.name));

      if (methods.length === 0) {
        return null;
      }

      const pathItem: OpenAPIV3.PathItemObject = {};

      for (const method of methods) {
        try {
          const operation = await this.extractOperation(method, filePath);
          if (operation) {
            pathItem[method.name.toLowerCase() as Lowercase<OpenAPIV3.HttpMethods>] = operation;
            this.debugLog("[AST] Generated operation for", method.name, ":", operation);
          }
        } catch (error) {
          this.debugLog("[AST] Failed to extract operation for", method.name, ":", error);
          // Continue with other methods
        }
      }

      return Object.keys(pathItem).length > 0 ? pathItem : null;
    } catch (error) {
      this.debugLog("[AST] Error analyzing file:", filePath, error);
      return null;
    }
  }

  private findHttpMethods(
    sourceFile: SourceFile,
    configuredMethods: string[] = []
  ): MethodInfo[] {
    const methods: MethodInfo[] = [];
    const configuredMethodsLower = configuredMethods.map((m) => m.toLowerCase());

    // Find exported function declarations: export async function GET() {}
    const functions = sourceFile.getFunctions();
    for (const func of functions) {
      if (func.hasExportKeyword()) {
        const name = func.getName();
        if (name && HTTP_METHODS.includes(name.toUpperCase())) {
          const upperName = name.toUpperCase();
          if (!configuredMethodsLower.includes(upperName.toLowerCase())) {
            methods.push({
              name: upperName,
              declaration: func,
            });
          } else {
            this.debugLog("[AST] Skipping method (already configured):", upperName);
          }
        }
      }
    }

    // Find exported const declarations: export const DELETE = async () => {}
    const variableStatements = sourceFile.getVariableStatements();
    for (const statement of variableStatements) {
      if (statement.hasExportKeyword()) {
        const declarations = statement.getDeclarations();
        for (const decl of declarations) {
          const name = decl.getName();
          if (HTTP_METHODS.includes(name.toUpperCase())) {
            const upperName = name.toUpperCase();
            if (!configuredMethodsLower.includes(upperName.toLowerCase())) {
              methods.push({
                name: upperName,
                declaration: decl,
              });
            } else {
              this.debugLog("[AST] Skipping method (already configured):", upperName);
            }
          }
        }
      }
    }

    return methods;
  }

  private async extractOperation(
    method: MethodInfo,
    filePath: string
  ): Promise<OpenAPIV3.OperationObject | null> {
    try {
      this.debugLog("[AST] Extracting operation for:", method.name);

      // Extract JSDoc information
      const jsdocInfo = this.extractJSDocInfo(method.declaration);

      // Create basic operation
      const operation: OpenAPIV3.OperationObject = {
        summary: jsdocInfo.summary || `${method.name} ${this.extractRouteFromPath(filePath)}`,
        responses: {
          "200": {
            description: "Success",
          },
        },
      };

      if (jsdocInfo.description) {
        operation.description = jsdocInfo.description;
      }

      if (jsdocInfo.tags && jsdocInfo.tags.length > 0) {
        operation.tags = jsdocInfo.tags;
      }

      if (jsdocInfo.deprecated) {
        operation.deprecated = true;
      }

      // Analyze parameters
      const parameters: OpenAPIV3.ParameterObject[] = [];

      // Add path parameters
      const pathParams = this.analyzePathParameters(filePath, method);
      parameters.push(...pathParams);

      // Add query parameters
      const queryParams = this.analyzeQueryParameters(method);
      parameters.push(...queryParams);

      if (parameters.length > 0) {
        operation.parameters = parameters;
      }

      // Analyze request body
      const requestBody = this.analyzeRequestBody(method);
      if (requestBody) {
        operation.requestBody = requestBody;
      }

      // Analyze responses
      const responses = this.analyzeResponses(method);
      if (responses && Object.keys(responses).length > 0) {
        operation.responses = responses;
      }

      return operation;
    } catch (error) {
      this.debugLog("[AST] Error extracting operation:", error);
      // Return minimal valid operation
      return {
        summary: `${method.name} ${this.extractRouteFromPath(filePath)}`,
        responses: {
          "200": {
            description: "Success",
          },
        },
      };
    }
  }

  private extractJSDocInfo(declaration: FunctionDeclaration | VariableDeclaration): {
    summary?: string;
    description?: string;
    tags?: string[];
    deprecated?: boolean;
  } {
    const info: {
      summary?: string;
      description?: string;
      tags?: string[];
      deprecated?: boolean;
    } = {};

    // Only FunctionDeclaration has getJsDocs
    if (!(declaration instanceof FunctionDeclaration)) {
      return info;
    }

    const jsDocs = declaration.getJsDocs();

    if (jsDocs.length === 0) {
      return info;
    }

    const jsDoc = jsDocs[0];
    if (!jsDoc) return info;

    const comment = jsDoc.getComment();
    const tags = jsDoc.getTags();

    // Extract tags
    const tagNames: string[] = [];
    for (const tag of tags) {
      const tagName = tag.getTagName();

      if (tagName === "summary") {
        info.summary = tag.getComment()?.toString() || "";
      } else if (tagName === "description") {
        info.description = tag.getComment()?.toString() || "";
      } else if (tagName === "tag") {
        const tagValue = tag.getComment()?.toString();
        if (tagValue) tagNames.push(tagValue);
      } else if (tagName === "deprecated") {
        info.deprecated = true;
      }
    }

    if (tagNames.length > 0) {
      info.tags = tagNames;
    }

    // If no explicit summary, use first line of comment
    if (!info.summary && comment) {
      const commentText = comment.toString();
      const lines = commentText.split("\n");
      info.summary = lines[0]?.trim() || "";

      // If no explicit description, use remaining lines
      if (!info.description && lines.length > 1) {
        info.description = lines.slice(1).join("\n").trim();
      }
    }

    return info;
  }

  private extractRouteFromPath(filePath: string): string {
    const routePath = filePath
      .replace("src/routes/", "")
      .replace("/+server.ts", "")
      .replace("+server.ts", "");
    return routePath ? `/${routePath}` : "/";
  }

  private analyzePathParameters(
    filePath: string,
    method: MethodInfo
  ): OpenAPIV3.ParameterObject[] {
    const params: OpenAPIV3.ParameterObject[] = [];

    // Extract from file path: [id], [[optional]], [...rest]
    const paramPattern = /\[([^\]]+)\]/g;
    const matches = filePath.matchAll(paramPattern);

    for (const match of matches) {
      const param = match[1];
      if (!param) continue;

      let name = param;
      let required = true;

      // Handle optional parameters: [[lang]]
      if (param.startsWith("[") && param.endsWith("]")) {
        name = param.slice(1, -1);
        required = false;
      }

      // Handle rest parameters: [...slug]
      if (param.startsWith("...")) {
        name = param.slice(3);
      }

      if (!name) continue;

      params.push({
        name,
        in: "path",
        required,
        schema: { type: "string" },
      });
    }

    return params;
  }

  private analyzeQueryParameters(method: MethodInfo): OpenAPIV3.ParameterObject[] {
    const params: OpenAPIV3.ParameterObject[] = [];
    const queryParamNames = new Set<string>();

    // Get the function body
    const func = this.getFunctionFromMethod(method);
    if (!func) return params;

    // Find searchParams.get('name') calls
    const callExpressions = func.getDescendantsOfKind(SyntaxKind.CallExpression);

    for (const call of callExpressions) {
      const expression = call.getExpression();
      const expressionText = expression.getText();

      // Check for searchParams.get() or url.searchParams.get()
      if (expressionText.includes("searchParams.get")) {
        const args = call.getArguments();
        if (args.length > 0) {
          const arg = args[0];
          if (!arg) continue;
          // Extract string literal argument
          if (arg.getKind() === SyntaxKind.StringLiteral) {
            const paramName = arg.getText().replace(/['"]/g, "");
            queryParamNames.add(paramName);
          }
        }
      }
    }

    // Convert to OpenAPI parameters
    for (const name of queryParamNames) {
      params.push({
        name,
        in: "query",
        required: false,
        schema: { type: "string" },
      });
    }

    this.debugLog("[AST] Detected query params:", Array.from(queryParamNames));

    return params;
  }

  private analyzeRequestBody(method: MethodInfo): OpenAPIV3.RequestBodyObject | undefined {
    const func = this.getFunctionFromMethod(method);
    if (!func) return undefined;

    // Look for await request.json() calls
    const awaitExpressions = func.getDescendantsOfKind(SyntaxKind.AwaitExpression);

    for (const awaitExpr of awaitExpressions) {
      const expression = awaitExpr.getExpression();

      if (expression.getKind() === SyntaxKind.CallExpression) {
        const callExpr = expression.asKindOrThrow(SyntaxKind.CallExpression);
        const callText = callExpr.getExpression().getText();

        if (callText.includes("request.json")) {
          this.debugLog("[AST] Detected request.json() call");

          // Try to extract type information
          const parent = awaitExpr.getParent();
          let schema: any = { type: "object" };

          // Check for variable declaration with type: const body: UserInput = await request.json()
          if (parent && parent.getKind() === SyntaxKind.VariableDeclaration) {
            const varDecl = parent.asKindOrThrow(SyntaxKind.VariableDeclaration);
            const typeNode = varDecl.getTypeNode();

            if (typeNode) {
              const type = typeNode.getType();
              schema = this.resolveTypeToJsonSchema(type);
              this.debugLog("[AST] Resolved request body type to schema");
            } else {
              // Check for destructuring: const { email, name } = await request.json()
              const name = varDecl.getName();
              if (name.startsWith("{") && name.endsWith("}")) {
                const properties: Record<string, any> = {};
                const propNames = name
                  .slice(1, -1)
                  .split(",")
                  .map((s) => s.trim());

                for (const propName of propNames) {
                  properties[propName] = {};
                }

                schema = {
                  type: "object",
                  properties,
                };
                this.debugLog("[AST] Inferred schema from destructuring:", propNames);
              }
            }
          }

          return {
            required: true,
            content: {
              "application/json": {
                schema,
              },
            },
          };
        }
      }
    }

    return undefined;
  }

  private analyzeResponses(method: MethodInfo): OpenAPIV3.ResponsesObject {
    const responses: OpenAPIV3.ResponsesObject = {};
    const func = this.getFunctionFromMethod(method);

    if (!func) {
      return {
        "200": {
          description: "Success",
        },
      };
    }

    const statusCodes = new Set<string>(["200"]); // Default 200

    // Find return statements with json() calls
    const returnStatements = func.getDescendantsOfKind(SyntaxKind.ReturnStatement);

    for (const returnStmt of returnStatements) {
      const expression = returnStmt.getExpression();
      if (!expression) continue;

      const exprText = expression.getText();

      // Check for json(data, { status: 201 })
      if (exprText.includes("json(")) {
        // Try to extract status code from second argument
        if (expression.getKind() === SyntaxKind.CallExpression) {
          const callExpr = expression.asKindOrThrow(SyntaxKind.CallExpression);
          const args = callExpr.getArguments();

          if (args.length > 1) {
            const secondArg = args[1];
            if (secondArg) {
              const secondArgText = secondArg.getText();

              // Extract status: 201 or { status: 201 }
              const statusMatch = secondArgText.match(/status:\s*(\d+)/);
              if (statusMatch && statusMatch[1]) {
                statusCodes.add(statusMatch[1]);
              } else if (/^\d+$/.test(secondArgText)) {
                // Direct number: json(data, 201)
                statusCodes.add(secondArgText);
              }
            }
          }

          // Try to extract response type from generic or first argument
          const firstArg = args[0];
          if (firstArg) {
            const type = firstArg.getType();
            const schema = this.resolveTypeToJsonSchema(type);

            // Store schema for status codes
            for (const code of statusCodes) {
              if (!responses[code]) {
                responses[code] = {
                  description: code === "200" ? "Success" : `Response ${code}`,
                  content: {
                    "application/json": {
                      schema,
                    },
                  },
                };
              }
            }
          }
        }
      }
    }

    // Find error() calls for error responses
    const callExpressions = func.getDescendantsOfKind(SyntaxKind.CallExpression);

    for (const call of callExpressions) {
      const exprText = call.getExpression().getText();

      if (exprText === "error") {
        const args = call.getArguments();
        if (args.length > 0) {
          const firstArg = args[0];
          if (firstArg) {
            const statusCode = firstArg.getText();

            if (/^\d+$/.test(statusCode)) {
              statusCodes.add(statusCode);

              // Try to extract error body type
              if (args.length > 1) {
                const secondArg = args[1];
                if (secondArg) {
                  const type = secondArg.getType();
                  const schema = this.resolveTypeToJsonSchema(type);

                  responses[statusCode] = {
                    description: `Error ${statusCode}`,
                    content: {
                      "application/json": {
                        schema,
                      },
                    },
                  };
                }
              }
            }
          }
        }
      }
    }

    // Ensure at least 200 response exists
    if (!responses["200"]) {
      responses["200"] = {
        description: "Success",
      };
    }

    this.debugLog("[AST] Detected status codes:", Array.from(statusCodes));

    return responses;
  }

  private resolveTypeToJsonSchema(type: Type): any {
    try {
      // Handle string type
      if (type.isString() || type.isStringLiteral()) {
        return { type: "string" };
      }

      // Handle number type
      if (type.isNumber() || type.isNumberLiteral()) {
        return { type: "number" };
      }

      // Handle boolean type
      if (type.isBoolean() || type.isBooleanLiteral()) {
        return { type: "boolean" };
      }

      // Handle null/undefined
      if (type.isNull() || type.isUndefined()) {
        return { type: "null" };
      }

      // Handle arrays
      if (type.isArray()) {
        const arrayType = type.getArrayElementType();
        if (arrayType) {
          return {
            type: "array",
            items: this.resolveTypeToJsonSchema(arrayType),
          };
        }
        return { type: "array", items: {} };
      }

      // Handle unions
      if (type.isUnion()) {
        const unionTypes = type.getUnionTypes();

        // Check if it's a literal union (enum-like)
        const literals = unionTypes.filter(
          (t) => t.isStringLiteral() || t.isNumberLiteral()
        );

        if (literals.length === unionTypes.length && literals.length > 0) {
          // It's an enum
          const enumValues = literals.map((t) => {
            if (t.isStringLiteral()) {
              return t.getLiteralValue();
            } else if (t.isNumberLiteral()) {
              return t.getLiteralValue();
            }
            return null;
          }).filter(v => v !== null);

          if (enumValues.length > 0) {
            const firstType = typeof enumValues[0];
            return {
              type: firstType === "string" ? "string" : "number",
              enum: enumValues,
            };
          }
        }

        // Regular union
        return {
          oneOf: unionTypes.map((t) => this.resolveTypeToJsonSchema(t)),
        };
      }

      // Handle object types
      if (type.isObject()) {
        const properties: Record<string, any> = {};
        const required: string[] = [];

        const props = type.getProperties();

        for (const prop of props) {
          const propName = prop.getName();

          // Get type at declaration
          const declarations = prop.getDeclarations();
          if (declarations.length > 0 && declarations[0]) {
            const propType = declarations[0].getType();
            properties[propName] = this.resolveTypeToJsonSchema(propType);

            // Check if required (not optional)
            const propSymbol = prop as TsSymbol;
            if (!propSymbol.isOptional()) {
              required.push(propName);
            }
          }
        }

        const schema: any = {
          type: "object",
          properties,
        };

        if (required.length > 0) {
          schema.required = required;
        }

        return schema;
      }

      // Fallback for unknown types
      return {};
    } catch (error) {
      this.debugLog("[AST] Error resolving type to JSON Schema:", error);
      return {};
    }
  }

  private getFunctionFromMethod(method: MethodInfo): FunctionDeclaration | undefined {
    if (method.declaration instanceof FunctionDeclaration) {
      return method.declaration;
    }

    // For VariableDeclaration, try to get the function from initializer
    if (method.declaration instanceof VariableDeclaration) {
      const initializer = method.declaration.getInitializer();
      if (initializer) {
        // Check if it's an arrow function or function expression
        if (
          initializer.getKind() === SyntaxKind.ArrowFunction ||
          initializer.getKind() === SyntaxKind.FunctionExpression
        ) {
          // Convert to function-like structure
          // For now, return undefined and handle in calling code
          return undefined;
        }
      }
    }

    return undefined;
  }
}
