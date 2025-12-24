import { defaultTheme } from "@sveltepress/theme-default";
import { sveltepress } from "@sveltepress/vite";
import { defineConfig } from "vite";

const config = defineConfig({
  plugins: [
    sveltepress({
      theme: defaultTheme({
        navbar: [
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
                { title: "What is SvelteKit Auto OpenAPI?", to: "/introduction/" },
                { title: "Quick Start", to: "/introduction/quick-start/" },
              ],
            },
            {
              title: "Fundamentals",
              collapsible: true,
              items: [
                { title: "Overview", to: "/fundamentals/" },
                { title: "Plugin Configuration", to: "/fundamentals/plugin/" },
                { title: "Route Configuration", to: "/fundamentals/route-config/" },
                { title: "Scalar Module", to: "/fundamentals/scalar-module/" },
              ],
            },
            {
              title: "Guides",
              collapsible: true,
              items: [
                { title: "Validation", to: "/guides/validation/" },
                { title: "Error Handling", to: "/guides/error-handling/" },
                { title: "Best Practices", to: "/guides/best-practices/" },
              ],
            },
            {
              title: "Advanced",
              collapsible: true,
              items: [
                { title: "Overview", to: "/advanced/" },
                { title: "Virtual Modules", to: "/advanced/virtual-modules/" },
                { title: "Sync Helper", to: "/advanced/sync-helper/" },
                { title: "Validation Wrapper", to: "/advanced/validation-wrapper/" },
                { title: "Type System", to: "/advanced/type-system/" },
              ],
            },
            {
              title: "Other",
              collapsible: true,
              items: [
                { title: "Examples", to: "/examples/" },
                { title: "Milestones", to: "/milestones/" },
              ],
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
            "lightning",
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
