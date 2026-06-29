// Resolve public Sanity config from Vite's inlined `import.meta.env` (present in
// the browser studio AND the SSR worker bundle), falling back to `process.env`
// for plain Node — i.e. the Sanity CLI, where `import.meta.env` is undefined.
//
// NOTE: do NOT gate this on `typeof process` / an `isNode` flag. The client
// bundle polyfills `process` (`globalThis.process ??= {}`), so such a check is
// truthy in the browser and would read an EMPTY `process.env` — which is what
// left the /cms studio with a blank projectId ("Configuration must contain
// `projectId`"). `import.meta.env.*` is statically inlined at build, so reading
// it first is correct everywhere it's defined.
const viteEnv = import.meta.env as unknown as
  | Record<string, string | undefined>
  | undefined;
const nodeEnv = typeof process === "undefined" ? undefined : process.env;

const config = {
  sanity: {
    apiVersion:
      viteEnv?.SANITY_API_VERSION || nodeEnv?.SANITY_API_VERSION || "2023-06-21",
    dataset:
      viteEnv?.PUBLIC_SANITY_STUDIO_DATASET ||
      nodeEnv?.PUBLIC_SANITY_STUDIO_DATASET ||
      "",
    projectId:
      viteEnv?.PUBLIC_SANITY_STUDIO_PROJECT_ID ||
      nodeEnv?.PUBLIC_SANITY_STUDIO_PROJECT_ID ||
      "",
    studioUrl: "/",
  },
  siteName: "Munchies",
};

export default config;
