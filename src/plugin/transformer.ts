import { Project, SyntaxKind, Node } from "ts-morph";

const VALID_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"];

export function transformServerCode(code: string, id: string): string | null {
  // Quick check for _config export (fast path)
  if (!code.includes("_config")) return null;

  const project = new Project({ useInMemoryFileSystem: true });
  const sourceFile = project.createSourceFile(id, code);

  // Verify _config export exists
  const configExport = sourceFile.getExportedDeclarations().get("_config");
  if (!configExport || configExport.length === 0) return null;

  let needsTransform = false;

  // Check for methods that need wrapping
  const exportedDeclarations = sourceFile.getExportedDeclarations();
  for (const [name] of exportedDeclarations) {
    if (VALID_METHODS.includes(name)) {
      needsTransform = true;
      break;
    }
  }

  if (!needsTransform) return null;

  // Add import for __validate at the top of the file
  sourceFile.insertStatements(
    0,
    'import { __validate } from "sveltekit-auto-openapi/runtime";'
  );

  // Transform each HTTP method
  for (const [name, declarations] of exportedDeclarations) {
    if (!VALID_METHODS.includes(name)) continue;

    const decl = declarations[0];

    // Handle: export const POST = async () => {...}
    if (Node.isVariableDeclaration(decl)) {
      const initializer = decl.getInitializer();
      if (!initializer) continue;

      // Check if it's a function or arrow function
      if (
        !Node.isFunctionExpression(initializer) &&
        !Node.isArrowFunction(initializer)
      ) {
        continue; // Skip non-function exports
      }

      const originalText = initializer.getText();
      initializer.replaceWithText(
        `__validate('${name}', _config, ${originalText})`
      );
    }
    // Handle: export async function POST() {...}
    else if (Node.isFunctionDeclaration(decl)) {
      const isAsync = decl.isAsync();
      const params = decl
        .getParameters()
        .map((p) => p.getText())
        .join(", ");
      const body = decl.getBodyText() || "";

      // Remove function declaration
      decl.remove();

      // Add wrapped const export
      sourceFile.addStatements(
        `export const ${name} = __validate('${name}', _config, ${
          isAsync ? "async " : ""
        }(${params}) => {
${body}
});`
      );
    }
  }

  return sourceFile.getFullText();
}
