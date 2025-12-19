---
title: SvelteKit Auto OpenAPI
actions:
  - label: Get Started
    type: primary
    to: /introduction/quick-start/
  - label: View on GitHub
    type: secondary
    to: https://github.com/SaaSTEMLY/sveltekit-auto-openapi
    external: true
features:
  - title: Automatic Inference
    description: Generates OpenAPI schemas by analyzing your request.json<Type>() calls
    icon:
      type: iconify
      collection: carbon
      name: ibm-software-watsonx-data-analyze-and-process
    link: /essentials/usage-in-server-routes/automatic-ast-inference/
  - title: Runtime Validation
    description: Validates requests using JSON Schema with StandardSchema support (Zod, Valibot, TypeBox, ArkType)
    icon:
      type: iconify
      collection: carbon
      name: checkmark-filled
    link: /essentials/schema-validation-hook/
  - title: Interactive Documentation
    description: Built-in Scalar integration for beautiful API references
    icon:
      type: iconify
      collection: carbon
      name: document-export
    link: /essentials/scalar-module/
  - title: Zero Boilerplate
    description: Works directly with standard SvelteKit +server.ts files
    icon:
      type: iconify
      collection: carbon
      name: code
    link: /essentials/usage-in-server-routes/automatic-ast-inference/
  - title: Hot Reload
    description: OpenAPI schemas update instantly as you modify routes
    icon:
      type: iconify
      collection: carbon
      name: renew
    link: /essentials/plugin-configuration/
  - title: Type Safety
    description: Full TypeScript support with type inference from schemas
    icon:
      type: iconify
      collection: vscode-icons
      name: file-type-typescript
    link: /advanced/type-safety/
---

## Warning: Experimental v0

This library is in early development (v0) and **not recommended for production use**. APIs may change, and there may be undiscovered bugs. Use at your own risk.

**Contributions are welcome!** If you'd like to help improve this project, please feel free to open issues or submit pull requests.
