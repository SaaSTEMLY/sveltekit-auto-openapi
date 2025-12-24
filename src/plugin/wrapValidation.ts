export async function wrapWithValidation(
  code: string,
  _id: string,
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
): Promise<string | null> {
  // Check if file has _config export
  if (!code.includes("export const _config")) {
    return null; // No transformation needed
  }

  // Extract HTTP method exports
  const methods = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"];
  let transformed = code;
  const wrappedMethods: string[] = [];

  for (const method of methods) {
    // Match: export async function GET( or export function GET(
    const exportRegex = new RegExp(
      `export\\s+(async\\s+)?function\\s+${method}\\s*\\(`,
      "g"
    );

    if (exportRegex.test(code)) {
      transformed = wrapHandler(transformed, method, skipValidationDefault, returnsDetailedErrorDefault);
      wrappedMethods.push(method);
    }
  }

  if (wrappedMethods.length === 0) return null;

  // Add validation wrapper import at top
  const importStatement = `import { validationWrapper as __validationWrapper } from 'sveltekit-auto-openapi/validation-wrapper';\n`;
  transformed = importStatement + transformed;

  return transformed;
}

function wrapHandler(
  code: string,
  method: string,
  skipValidationDefault?: any,
  returnsDetailedErrorDefault?: any
): string {
  // Find the function and rename it
  const regex = new RegExp(
    `export\\s+(async\\s+)?function\\s+${method}\\s*\\(([^)]*)\\)`,
    "g"
  );

  let wrapped = code.replace(regex, (_match, asyncKeyword, params) => {
    const async = asyncKeyword ? "async " : "";
    return `${async}function __original_${method}(${params})`;
  });

  // Serialize config parameters
  const skipConfigStr = skipValidationDefault
    ? `, ${JSON.stringify(skipValidationDefault)}`
    : ", undefined";

  const detailedErrorConfigStr = returnsDetailedErrorDefault
    ? `, ${JSON.stringify(returnsDetailedErrorDefault)}`
    : "";

  // Add wrapper export at end of file
  wrapped += `\nexport const ${method} = await __validationWrapper(_config, '${method}', __original_${method}${skipConfigStr}${detailedErrorConfigStr});\n`;

  return wrapped;
}
