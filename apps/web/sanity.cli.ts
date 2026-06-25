import { resolve } from "node:path";
import { defineCliConfig } from "sanity/cli";
// Import the lightweight config (not the full studio config) so the CLI-config
// loader (jiti, JSX disabled) never has to parse the JSX studio components.
import config from "@/sanity/config";

export default defineCliConfig({
  api: {
    projectId: config.sanity.projectId,
    dataset: config.sanity.dataset,
  },
  project: {
    basePath: config.sanity.studioUrl,
  },
  typegen: {
    path: "./src/sanity/**/*.{ts,tsx,js,jsx}",
    schema: "./schema.json",
    generates: "./sanity.types.ts",
  },
  vite: {
    resolve: {
      alias: {
        "@": resolve(import.meta.dirname, "src"),
      },
    },
  },
});
