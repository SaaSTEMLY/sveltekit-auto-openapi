import {
  SyntaxKind,
  Type,
  VariableDeclaration,
  type SourceFile,
  type Node,
} from "ts-morph";
import { defu } from "defu";

/** Helper: Recursively map TypeScript Types to OpenAPI Schema
 * Handles Primitives, Arrays, and Objects
 */
function mapTypeToOpenApi(type: Type): any {
  // 1. Handle Primitives
  if (type.isString() || type.isStringLiteral()) return { type: "string" };
  if (type.isNumber() || type.isNumberLiteral()) return { type: "number" };
  if (type.isBoolean() || type.isBooleanLiteral()) return { type: "boolean" };

  // 2. Handle Arrays
  if (type.isArray()) {
    const arrayType = type.getArrayElementType();
    return {
      type: "array",
      items: arrayType ? mapTypeToOpenApi(arrayType) : {},
    };
  }

  // 3. Handle Objects (Interfaces, Type Literals, Classes)
  if (type.isObject()) {
    const properties: Record<string, any> = {};
    const required: string[] = [];

    // Get all properties (including inherited ones)
    type.getProperties().forEach((prop) => {
      const propName = prop.getName();

      // Skip internal JS/TS properties if necessary
      if (propName.startsWith("__")) return;

      // Get the type of the property
      // We use getValueDeclaration() to get the definition node, then get its type
      const valDecl = prop.getValueDeclaration();
      const propType = valDecl ? valDecl.getType() : prop.getDeclaredType(); // Fallback

      properties[propName] = mapTypeToOpenApi(propType);

      // Check if optional (question mark token)
      if (!prop.isOptional()) {
        required.push(propName);
      }
    });

    return {
      type: "object",
      properties,
      required: required.length > 0 ? required : undefined,
      additionalProperties: false,
    };
  }

  // 4. Fallback for Any/Unknown
  return { type: "object" }; // Default generic object
}

/** Helper: Extract status codes from the second argument of json() call
 * Supports literal values, variables with literal types, and union types
 */
function extractStatusCodes(arg: Node | null): string[] {
  if (!arg) return ["200"]; // Default if no second argument

  // Case 1: Object literal { status: 201 } or { status: variable }
  if (arg.getKind() === SyntaxKind.ObjectLiteralExpression) {
    const objLiteral = arg.asKind(SyntaxKind.ObjectLiteralExpression);
    if (!objLiteral) return ["200"];

    for (const prop of objLiteral.getProperties()) {
      if (prop.getKind() === SyntaxKind.PropertyAssignment) {
        const propAssign = prop.asKind(SyntaxKind.PropertyAssignment);
        if (propAssign?.getName() === "status") {
          const initializer = propAssign.getInitializer();
          if (!initializer) continue;

          // Direct numeric literal
          if (initializer.getKind() === SyntaxKind.NumericLiteral) {
            return [initializer.getText()];
          }

          // Variable or expression - check type
          const type = initializer.getType();
          const literalCodes = extractLiteralCodesFromType(type);
          if (literalCodes.length > 0) {
            return literalCodes;
          }
        }
      }
    }
  }

  return ["200"]; // Default fallback
}

/** Helper: Extract literal values from a TypeScript type
 * Handles single literals and union types (e.g., 200 | 201 | 404)
 */
function extractLiteralCodesFromType(type: Type): string[] {
  const codes: string[] = [];

  // Check if it's a union type (e.g., 200 | 201 | 404)
  if (type.isUnion()) {
    for (const unionType of type.getUnionTypes()) {
      if (unionType.isNumberLiteral()) {
        const value = unionType.getLiteralValue();
        if (typeof value === "number") {
          codes.push(value.toString());
        }
      }
    }
  }
  // Single literal type
  else if (type.isNumberLiteral()) {
    const value = type.getLiteralValue();
    if (typeof value === "number") {
      codes.push(value.toString());
    }
  }

  return codes;
}

/** Helper: Custom deep merge that replaces arrays and deletes null properties
 * - If source property is null, delete the property from target
 * - If source property is an array, replace target array completely
 * - Otherwise, recursively merge objects
 */
function customDeepMerge(target: any, source: any): any {
  // If source is null, return null (will be cleaned up later)
  if (source === null) {
    return null;
  }

  // If source is an array, replace target completely
  if (Array.isArray(source)) {
    return [...source];
  }

  // If source is not an object, use source
  if (typeof source !== "object" || source === null) {
    return source;
  }

  // If target is not an object, start fresh with source
  if (typeof target !== "object" || target === null || Array.isArray(target)) {
    target = {};
  }

  // Merge objects
  const result: any = { ...target };

  for (const [key, sourceValue] of Object.entries(source)) {
    if (sourceValue === null) {
      // Null deletes the property
      delete result[key];
    } else if (Array.isArray(sourceValue)) {
      // Arrays replace completely
      result[key] = [...sourceValue];
    } else if (typeof sourceValue === "object") {
      // Recursively merge objects
      result[key] = customDeepMerge(result[key], sourceValue);
    } else {
      // Primitive values replace
      result[key] = sourceValue;
    }
  }

  return result;
}

/** Helper: Convert individual Zod Standard Field to OpenAPI Schema
 * Handles primitives, arrays, objects, and optional types
 */
function convertStandardField(field: any): any {
  if (!field?.def) return {};

  const def = field.def;
  const result: any = {};

  // Map Zod type to JSON Schema type
  switch (def.type) {
    case "string":
      result.type = "string";
      // Extract string constraints from field level (Zod v4)
      if (field.minLength !== undefined && field.minLength !== null) {
        result.minLength = field.minLength;
      }
      if (field.maxLength !== undefined && field.maxLength !== null) {
        result.maxLength = field.maxLength;
      }
      if (field.format !== undefined && field.format !== null) {
        result.format = field.format;
      }
      break;
    case "number":
      result.type = "number";
      // Check for integer at field level (Zod v4)
      if (field.isInt) {
        result.type = "integer";
      }
      break;
    case "integer":
      result.type = "integer";
      break;
    case "boolean":
      result.type = "boolean";
      break;
    case "array":
      result.type = "array";
      if (def.items) {
        result.items = convertStandardField(def.items);
      }
      break;
    case "object":
      return standardSchemaToOpenApi(field);
    case "optional":
      // Handle optional fields by processing the inner type
      if (def.innerType) {
        return convertStandardField(def.innerType);
      }
      break;
    default:
      result.type = "object";
  }

  // Extract description from field level (Zod v4)
  if (field.description !== undefined && field.description !== null) {
    result.description = field.description;
  }

  return result;
}

/** Helper: Map HTTP status codes to standard descriptions
 * Defaults to "Success" if unknown
 */
export function getStatusDescription(statusCode: string): string {
  const descriptions: Record<string, string> = {
    "200": "OK",
    "201": "Created",
    "202": "Accepted",
    "204": "No Content",
    "400": "Bad Request",
    "401": "Unauthorized",
    "403": "Forbidden",
    "404": "Not Found",
    "500": "Internal Server Error",
  };
  return descriptions[statusCode] || "Success";
}

/** Helper: Convert Zod Standard Schema to OpenAPI JSON Schema
 * Fallback for when zodToJsonSchema fails (Zod v4 compatibility issue)
 */
export function standardSchemaToOpenApi(schema: any): any {
  // If it has the ~standard property, it's a Zod v4 standard schema
  if (schema?.["~standard"]?.vendor === "zod" && schema.def) {
    const def = schema.def;

    // Handle object type
    if (def.type === "object" && def.shape) {
      const properties: Record<string, any> = {};
      const required: string[] = [];

      for (const [key, value] of Object.entries(def.shape)) {
        const fieldSchema: any = value;
        properties[key] = convertStandardField(fieldSchema);

        // Check if field is required (has no optional flag)
        if (!fieldSchema.def?.isOptional) {
          required.push(key);
        }
      }

      return {
        type: "object",
        properties,
        required: required.length > 0 ? required : undefined,
        additionalProperties: false,
      };
    }

    // Handle other types
    return convertStandardField(schema);
  }

  return {}; // Fallback
}

/** Helper: Format SvelteKit route file path to OpenAPI path
 * E.g., src/routes/users/[id]/+server.ts -> /users/{id}
 */
export const formatPath = (filePath: string) => {
  const formattedPath =
    "/" +
      filePath
        .replace(/^src\/routes\//, "") // Remove src/routes/ prefix
        .replace(/\+server\.ts$/, "")
        .replace(/\[\[\.\.\.(.*?)\]\]/g, "{$1}") // Handle optional catch-all [[...rest]] -> {rest}
        .replace(/\[\.\.\.(.*?)\]/g, "{$1}") // Handle catch-all [...rest] -> {rest}
        .replace(/\[(.*?)=.*?\]/g, "{$1}") // Handle matched params [id=int] -> {id}
        .replace(/\[(.*?)\]/g, "{$1}")
        // remove trailing slash
        .replace(/\/$/, "") ||
    // add slash for root
    "/";
  return formattedPath; // Handle standard params [id] -> {id}
};

/** Helper: Extract path parameters from SvelteKit route file path
 * E.g., src/routes/users/[id]/+server.ts -> [{ name: "id", in: "path", required: true, schema: { type: "string" } }]
 */
export function extractPathParams(filePath: string): any[] {
  const params: any[] = [];

  // Normalize path just in case
  const segments = filePath.split("/");

  segments.forEach((segment) => {
    // Regex to match [param] or [param=matcher] or [...rest]
    // 1. Optional spread operator (...)
    // 2. Param name
    // 3. Optional matcher (=matcher)
    const match = segment.match(/^\[(\.{3})?(\w+)(?:=(\w+))?\]$/);

    if (match) {
      const [, isSpread, name, matcher] = match;

      // Map SvelteKit matchers to OpenAPI types (heuristic)
      let schemaType = "string";
      if (matcher && (matcher === "integer" || matcher === "int")) {
        schemaType = "integer";
      } else if (matcher === "number") {
        schemaType = "number";
      }

      params.push({
        name: name,
        in: "path",
        required: true, // Path params are always required in OpenAPI
        description: isSpread ? "Catch-all parameter" : undefined,
        schema: {
          type: schemaType,
          // If it's an integer, we can add format
          format: schemaType === "integer" ? "int64" : undefined,
        },
      });
    }
  });

  return params;
}

/** Infer OpenAPI schemas from TypeScript AST for a given method
 * - Looks for request.json<T>() calls to infer request body schema
 * - Looks for json(...) response calls to infer response schemas
 * - Returns an object with requestBody and responses schemas
 * - Uses ts-morph for AST parsing and type analysis
 * - Handles variable declarations, type assertions, and generic calls
 * - Supports primitive types, arrays, and objects
 * - Returns empty object if no inference could be made
 */
export function inferFromAst(sourceFile: SourceFile, methodName: string) {
  const methodDecl =
    sourceFile.getFunction(methodName) ||
    sourceFile.getVariableDeclaration(methodName);
  if (!methodDecl) return {};

  const result: any = {};

  // 1. Find the function body
  // If it's a variable declaration (const POST = ...), the initializer might be an ArrowFunction
  let functionBody;
  if (methodDecl.getKind() === SyntaxKind.FunctionDeclaration) {
    functionBody = methodDecl.getFirstDescendantByKind(SyntaxKind.Block);
  } else if (methodDecl.getKind() === SyntaxKind.VariableDeclaration) {
    const initializer = (methodDecl as VariableDeclaration).getInitializer();
    if (
      initializer &&
      (initializer.getKind() === SyntaxKind.ArrowFunction ||
        initializer.getKind() === SyntaxKind.FunctionExpression)
    ) {
      functionBody = initializer.getFirstDescendantByKind(SyntaxKind.Block);
    }
  }

  if (!functionBody) return {};

  // 2. Traverse to find `await request.json()` usage
  functionBody.forEachDescendant((node: any) => {
    // FIX: Use instance method .getKind() instead of Node.isCallExpression(node)
    if (node.getKind() === SyntaxKind.CallExpression) {
      // "node" is now typed as a CallExpression in our logic logic
      const callExpr = node.asKind(SyntaxKind.CallExpression);
      if (!callExpr) return;

      const text = callExpr.getExpression().getText();

      // Check for explicit request.json() call
      if (text.endsWith("request.json")) {
        // Case A: Generic call -> request.json<UserType>()
        const typeArgs = callExpr.getTypeArguments();
        if (typeArgs.length > 0) {
          const type = typeArgs[0].getType();
          result.input = mapTypeToOpenApi(type);
          return;
        }

        // Case B: Variable declaration -> const body: UserType = ...
        const varDecl = node
          .getAncestors()
          .find((a: any) => a.getKind() === SyntaxKind.VariableDeclaration);
        if (varDecl) {
          // We need to cast it to VariableDeclaration to access specific methods safely
          const varDeclNode = varDecl.asKind(SyntaxKind.VariableDeclaration);

          const typeNode = varDeclNode?.getTypeNode();
          if (typeNode) {
            const type = typeNode.getType();
            result.input = mapTypeToOpenApi(type);
            return;
          }

          // Case C: Cast expression -> ... = await request.json() as UserType
          const awaitExpr = node.getParentIfKind(SyntaxKind.AwaitExpression);
          const asExpr = awaitExpr?.getParentIfKind(SyntaxKind.AsExpression);

          if (asExpr) {
            const type = asExpr.getType();
            result.input = mapTypeToOpenApi(type);
            return;
          }
        }
      }
    }
  });

  // 3. Inference for Responses (looking for `json(...)`)
  // Collect all possible responses from json() calls
  const responses: Record<
    string,
    { description: string; content: { "application/json": { schema: any } } }
  > = {};

  functionBody.forEachDescendant((node: any) => {
    // FIX: Use instance method .getKind()
    if (node.getKind() === SyntaxKind.CallExpression) {
      const callExpr = node.asKind(SyntaxKind.CallExpression);
      if (!callExpr) return;

      if (callExpr.getExpression().getText() === "json") {
        const args = callExpr.getArguments();
        if (args.length > 0) {
          const firstArg = args[0];
          const type = firstArg.getType();
          const schema = mapTypeToOpenApi(type);

          // Extract status codes from second argument
          const statusCodes = extractStatusCodes(
            args.length > 1 ? args[1] : null
          );

          // Add response for each detected status code
          for (const statusCode of statusCodes) {
            responses[statusCode] = {
              description: getStatusDescription(statusCode),
              content: { "application/json": { schema } },
            };
          }
        }
      }
    }
  });

  // Only add responses if at least one was found
  if (Object.keys(responses).length > 0) {
    result.responses = responses;
  }

  return result;
}

/** Helper: Convert JSON Schema object to OpenAPI parameters array
 * Used for query, path, header, and cookie parameters
 */
export function convertSchemaToParameters(
  schema: any,
  paramIn: "query" | "path" | "header" | "cookie"
): any[] {
  const parameters: any[] = [];

  // Schema should be an object type with properties
  if (schema.type === "object" && schema.properties) {
    const required = schema.required || [];

    for (const [name, propSchema] of Object.entries(schema.properties)) {
      const param: any = {
        name,
        in: paramIn,
        required: required.includes(name),
        schema: propSchema,
      };

      // Add description if available
      if ((propSchema as any).description) {
        param.description = (propSchema as any).description;
      }

      parameters.push(param);
    }
  }

  return parameters;
}

/** Helper: Clean up the merged operation object
 * - Removes properties with null values (allows deletion via Scenario A)
 * - Deduplicates arrays
 */
export function deduplicateArraysInOperation(obj: any): any {
  if (Array.isArray(obj)) {
    // Deduplicate array
    return [...new Set(obj)];
  }

  if (obj && typeof obj === "object") {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      // Skip null values - this allows Scenario A to delete properties
      if (value === null) {
        continue;
      }
      result[key] = deduplicateArraysInOperation(value);
    }
    return result;
  }

  return obj;
}

/** Helper: Custom merger with hybrid approach
 * - Scenario B and C are merged with defu (smart deep merge)
 * - Scenario A is merged with customDeepMerge (allows null deletion and array override)
 */
export function createCustomMerger(
  scenarioA: any,
  scenarioB: any,
  scenarioC: any,
  baseOperation: any
) {
  // First, merge B and C with base using defu (smart merge)
  // defu(object, ...defaults) - first arg has highest priority
  let result = defu(scenarioB, scenarioC, baseOperation);

  // Then apply Scenario A with custom deep merge (override semantics)
  result = customDeepMerge(result, scenarioA);

  return result;
}
