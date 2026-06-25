/** biome-ignore-all lint/style/noNamespace: - */
/// <reference path="../.astro/types.d.ts" />
/// <reference types="../worker-configuration.d.ts" />

// Cloudflare Workers Cache API extension
interface CacheStorage {
  default: Cache;
}

type Runtime = import("@astrojs/cloudflare").Runtime;

// @astrojs/cloudflare v14 exposes Worker bindings via the `cloudflare:workers`
// module (replacing `Astro.locals.runtime.env`). Type its `env` against our Env.
declare module "cloudflare:workers" {
  export const env: Env;
}

declare namespace App {
  interface Locals extends Runtime {
    countryCode: string;
    defaultCountryCode: string;
  }
}
