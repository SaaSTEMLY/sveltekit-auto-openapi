import { defaultTheme } from "@sveltepress/theme-default";
import { sveltepress } from "@sveltepress/vite";
import { defineConfig } from "vite";

const config = defineConfig({
  plugins: [
    sveltepress({
      theme: defaultTheme({
        navbar: [
          {
            title: "Guide",
            to: "/introduction/",
          },
          {
            title: "Reference",
            items: [
              { title: "Plugin", to: "/essentials/plugin-configuration/" },
              {
                title: "Validation Hook",
                to: "/essentials/schema-validation-hook/",
              },
              { title: "Scalar Module", to: "/essentials/scalar-module/" },
            ],
          },
          {
            title: "GitHub",
            to: "https://github.com/SaaSTEMLY/sveltekit-auto-openapi",
          },
          {
            title: "NPM",
            to: "https://www.npmjs.com/package/sveltekit-auto-openapi",
          },
        ],
        sidebar: {
          "/": [
            {
              title: "Introduction",
              collapsible: true,
              items: [
                {
                  title: "What is sveltekit-auto-openapi?",
                  to: "/introduction/what-is-sveltekit-auto-openapi/",
                },
                { title: "Quick Start", to: "/introduction/quick-start/" },
              ],
            },
            {
              title: "Essentials",
              collapsible: true,
              items: [
                {
                  title: "Plugin Configuration",
                  to: "/essentials/plugin-configuration/",
                },
                {
                  title: "Schema Validation Hook",
                  to: "/essentials/schema-validation-hook/",
                },
                { title: "Scalar Module", to: "/essentials/scalar-module/" },
              ],
            },
            {
              title: "Usage in +server.ts",
              collapsible: true,
              items: [
                {
                  title: "Automatic (AST Inference)",
                  to: "/essentials/usage-in-server-routes/automatic-ast-inference/",
                },
                {
                  title: "Advanced (_config RouteConfig)",
                  to: "/essentials/usage-in-server-routes/advanced-route-config/",
                },
              ],
            },
            {
              title: "Advanced",
              collapsible: true,
              items: [
                { title: "Virtual Modules", to: "/advanced/virtual-modules/" },
                {
                  title: "Validation Flags",
                  to: "/advanced/validation-flags/",
                },
                { title: "Type Safety", to: "/advanced/type-safety/" },
                { title: "Troubleshooting", to: "/advanced/troubleshooting/" },
              ],
            },
            {
              title: "Roadmap",
              to: "/roadmap/",
            },
          ],
        },
        github: "https://github.com/SaaSTEMLY/sveltekit-auto-openapi",
        logo: "/logo/main/pwa-512x512.png",
        preBuildIconifyIcons: {
          "vscode-icons": [
            "file-type-svelte",
            "file-type-markdown",
            "file-type-vite",
            "file-type-typescript",
          ],
          logos: ["typescript-icon", "svelte-kit"],
          emojione: ["artist-palette"],
          ph: ["smiley", "layout-duotone"],
          noto: ["package"],
          solar: ["chat-square-code-outline", "reorder-outline"],
          carbon: [
            "tree-view-alt",
            "import-export",
            "checkmark-filled",
            "renew",
            "ibm-software-watsonx-data-analyze-and-process",
            "document-export",
            "code",
          ],
          ic: ["sharp-rocket-launch"],
          tabler: ["icons"],
          mdi: ["theme-light-dark"],
          bi: ["list-nested"],
        },
      }),
      siteConfig: {
        title: "SvelteKit Auto OpenAPI",
        description:
          "Type-safe OpenAPI generation and runtime validation for SvelteKit",
      },
    }),
  ],
});

export default config;
