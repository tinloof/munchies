/** biome-ignore-all lint/performance/noNamespaceImport: alchemy/effect are namespace-imported by convention */
import * as Alchemy from "alchemy";
import * as Cloudflare from "alchemy/Cloudflare";
import * as GitHub from "alchemy/GitHub";
import * as Output from "alchemy/Output";
import * as Config from "effect/Config";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

/**
 * Alchemy deployment for the munchies Astro app + search worker.
 *
 * Astro builds itself (via its own `@astrojs/cloudflare` adapter) into a
 * self-contained Worker at `dist/server/entry.mjs` plus static assets in
 * `dist/client`. Alchemy then deploys that prebuilt output as-is — it does
 * NOT re-bundle or drive Vite, so every Astro integration (React, Tailwind,
 * fonts, svg-sprite, prefetch, `ssr.noExternal`) keeps working exactly as it
 * does today. This effectively replaces `astro build && wrangler deploy` with
 * Alchemy as the infrastructure layer.
 *
 * STAGES / PREVIEWS: the stack is stage-aware. The `prod` stage (push to main)
 * deploys to the stable worker names + the custom domain. Every other stage
 * (e.g. `pr-123` from CI, or a local `dev_*` stage) deploys fully isolated
 * resources with auto-generated, stage-scoped names and NO custom domain — so
 * previews never touch production. On a PR, the preview URL is posted back as
 * a comment.
 *
 * Auth + state use your Cloudflare profile (`alchemy login`). State is stored
 * remotely (`Cloudflare.state()`); run `pnpm alchemy:bootstrap` once first.
 */
export default Alchemy.Stack(
  "munchies-web",
  {
    providers: Layer.mergeAll(Cloudflare.providers(), GitHub.providers()),
    state: Cloudflare.state(),
  },
  Effect.gen(function* () {
    const stage = yield* Alchemy.Stage;
    const isProd = stage === "prod";

    // Search API worker (Orama over the product data committed in
    // apps/search/data). Co-deployed in this stack so `web` can bind to it as
    // a native service binding below. Alchemy bundles its source directly; the
    // data is committed, so no build step is needed here. Refresh the data
    // separately with `pnpm --filter @apps/search sync`.
    const search = yield* Cloudflare.Worker("Search", {
      // prod: stable name; previews: auto stage-scoped name.
      ...(isProd ? { name: "munchies-search" } : {}),
      main: "../search/src/index.ts",
      compatibility: {
        date: "2026-01-21",
        flags: ["nodejs_compat"],
      },
      observability: { enabled: true },
    });

    // Astro 7's Cloudflare adapter enables sessions by default and expects a
    // KV namespace bound as `SESSION`. Each stage gets its own namespace.
    const session = yield* Cloudflare.KVNamespace(
      "Session",
      isProd ? { title: "munchies-session" } : {}
    );

    // The Astro app is built SEPARATELY (`astro build`, run before this deploy
    // — see the alchemy:deploy script / CI build step) so its own
    // `@astrojs/cloudflare` adapter produces the worker (dist/server/entry.mjs)
    // and client assets (dist/client) with the correct build-time env. We
    // upload that prebuilt output as-is (bundle: false). This is deliberate:
    // building INSIDE the deploy would run `astro build` with Alchemy's
    // serialized binding env, which mangles the `Config.redacted(...)` values
    // and bakes a broken MEDUSA_BACKEND_URL (a public, build-inlined var) into
    // the bundle.
    const web = yield* Cloudflare.Worker("Web", {
      // Prebuilt worker + assets. Default module rules (ESModule for
      // **/*.js, **/*.mjs) upload entry.mjs and its ./chunks/*.mjs siblings the
      // same way Wrangler's no_bundle does.
      main: "dist/server/entry.mjs",
      bundle: false,
      assets: "dist/client",

      // prod: stable name + the production custom domain; previews: auto
      // stage-scoped name on a *.workers.dev URL, no custom domain.
      ...(isProd
        ? { name: "munchies-cf", domain: "munchies.tinloof.com" }
        : {}),
      compatibility: {
        date: "2026-01-21",
        flags: ["nodejs_compat", "global_fetch_strictly_public"],
      },
      observability: { enabled: true },

      env: {
        // Astro sessions KV.
        SESSION: session,

        // Service binding to the search worker above. Astro reads it as
        // `env.SEARCH` (a Fetcher) in src/components/plp/products-grid.astro.
        SEARCH: search,

        // RUNTIME secrets only (astro:env `access: "secret"`), resolved from the
        // environment at deploy time and stored as encrypted `secret_text`.
        // Public vars (MEDUSA_BACKEND_URL, CF_ZONE_ID, PUBLIC_*) are inlined by
        // `astro build` and do NOT need runtime bindings.
        SANITY_TOKEN: Config.redacted("SANITY_TOKEN"),
        MEDUSA_PUBLISHABLE_KEY: Config.redacted("MEDUSA_PUBLISHABLE_KEY"),
        CF_TOKEN: Config.redacted("CF_TOKEN"),
      },
    });

    // On a PR deploy (CI sets PULL_REQUEST), post/update a comment with the
    // preview URLs. GitHub auth comes from GITHUB_TOKEN; the constant logical
    // id means the same comment is edited on each push instead of duplicated.
    const pullRequest = process.env.PULL_REQUEST;
    if (pullRequest) {
      const [owner = "tinloof", repository = "medusa-dtc-starter-munchies"] = (
        process.env.GITHUB_REPOSITORY ?? "tinloof/medusa-dtc-starter-munchies"
      ).split("/");
      const shortSha = (process.env.GITHUB_SHA ?? "").slice(0, 7);

      yield* GitHub.Comment("PreviewComment", {
        owner,
        repository,
        issueNumber: Number(pullRequest),
        body: Output.interpolate`### 🚀 Preview deployed

| | URL |
| --- | --- |
| Web | ${web.url} |
| Search | ${search.url} |

Stage \`${stage}\` · commit \`${shortSha}\`

_Redeploys on every push; torn down when the branch is deleted._`,
      });
    }

    return {
      url: web.url,
      searchUrl: search.url,
    };
  })
);
