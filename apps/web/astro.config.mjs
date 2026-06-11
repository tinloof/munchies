// @ts-check
import { execSync } from "node:child_process";
import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import iosBackNavFix from "@tinloof/astro-ios-backnav-fix";
import prefetch from "@tinloof/astro-prefetch";
import { svgSprite } from "@tinloof/typed-svg-sprite/astro";
import { defineConfig, envField, fontProviders } from "astro/config";

const BUILD_VERSION = (() => {
  try {
    const sha = execSync("git rev-parse --short HEAD").toString().trim();
    return `${sha}-${Date.now()}`;
  } catch {
    return Date.now().toString();
  }
})();

// https://astro.build/config
export default defineConfig({
  prefetch: {
    defaultStrategy: "viewport",
  },
  output: "server",
  env: {
    schema: {
      PUBLIC_STRIPE_KEY: envField.string({
        context: "client",
        access: "public",
        optional: false,
      }),
      PUBLIC_SANITY_STUDIO_PROJECT_ID: envField.string({
        context: "client",
        access: "public",
        optional: false,
      }),
      PUBLIC_SANITY_STUDIO_DATASET: envField.string({
        context: "client",
        access: "public",
        optional: false,
      }),
      SANITY_TOKEN: envField.string({
        context: "server",
        access: "secret",
        optional: false,
      }),
      MEDUSA_BACKEND_URL: envField.string({
        context: "server",
        access: "public",
        optional: false,
      }),
      MEDUSA_PUBLISHABLE_KEY: envField.string({
        context: "server",
        access: "secret",
        optional: false,
      }),
      CF_ZONE_ID: envField.string({
        context: "server",
        access: "public",
        optional: false,
      }),
      CF_TOKEN: envField.string({
        context: "server",
        access: "secret",
        optional: false,
      }),
    },
  },
  integrations: [
    iosBackNavFix(),
    prefetch(),
    react(),
    svgSprite({
      generateIconComponent: {
        react: true,
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
    define: {
      "import.meta.env.BUILD_VERSION": JSON.stringify(BUILD_VERSION),
    },
    ssr: {
      noExternal: ["@medusajs/js-sdk", "sanity"],
    },
  },
  adapter: cloudflare(),
  experimental: {
    fonts: [
      {
        provider: fontProviders.google(),
        name: "Instrument Sans",
        cssVariable: "--font-instrumentSans",
        subsets: ["latin"],
        weights: ["400", "500", "600"],
      },
      {
        provider: fontProviders.google(),
        name: "Instrument Serif",
        cssVariable: "--font-instrumentSerif",
        subsets: ["latin"],
        weights: ["400"],
      },
      {
        provider: fontProviders.google(),
        name: "Climate Crisis",
        cssVariable: "--font-climateCrisis",
        subsets: ["latin"],
        weights: ["400"],
      },
    ],
  },
});
