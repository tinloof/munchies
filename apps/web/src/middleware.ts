import { defineMiddleware, sequence } from "astro:middleware";
import type { RequestContext } from "@/lib/context";
import config from "./config";
import { getTags, requestContext } from "./lib/context";

const BUILD_VERSION = import.meta.env.BUILD_VERSION;

const contextMiddleware = defineMiddleware((context, next) => {
  const ctx = context.locals.cfContext;
  const { cookies } = context;
  const tags = new Set<string>();
  return requestContext.run({ ctx, cookies, tags }, next);
});

const excludedPaths = [
  "/api",
  "/images",
  "/icons",
  "/cdn-cgi",
  "/favicon.ico",
  "/favicon-inactive.ico",
  "/_astro",
  "/_image",
  "/_server-islands",
  "/cms",
];

const cacheablePaths = ["/api/og"];

function isExcludedPath(pathname: string): boolean {
  // Check if path is explicitly cacheable (overrides exclusion)
  const isCacheable = cacheablePaths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
  if (isCacheable) {
    return false;
  }

  const match = excludedPaths.find(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
  return !!match;
}

const countryCodeMiddleware = defineMiddleware((context, next) => {
  const { pathname } = context.url;

  // Skip static assets and excluded paths
  if (isExcludedPath(pathname)) {
    return next();
  }

  // Extract first path segment
  const parts = pathname.split("/").filter(Boolean);
  const firstPart = parts[0]?.toLowerCase();

  // Redirect /us/... to /... (default country shouldn't appear in URL)
  if (firstPart === config.defaultCountryCode) {
    const restPath = `/${parts.slice(1).join("/")}`;
    return context.redirect(restPath || "/", 308);
  }

  // Check if path has a valid non-default country code
  const hasCountryCode =
    firstPart && config.supportedCountryCodes.includes(firstPart);

  // Store country code in locals for components
  const countryCode = hasCountryCode ? firstPart : config.defaultCountryCode;
  context.locals.countryCode = countryCode;
  context.locals.defaultCountryCode = config.defaultCountryCode;

  return next();
});

const cachingMiddleware = defineMiddleware(async (context, next) => {
  const { request, url } = context;
  const { pathname } = url;
  const ctx = context.locals.cfContext;

  // Skip caching for non-GET, API routes, CMS, static assets, and draft mode
  const isDraftMode = request.headers
    .get("cookie")
    ?.includes("sanity-draft-mode=true");

  if (isExcludedPath(pathname) || isDraftMode || request.method !== "GET") {
    return next();
  }

  // Cache API not available (e.g., dev mode or workers.dev domain)
  if (typeof caches === "undefined") {
    return next();
  }

  const cache = caches.default;
  const cacheKey = new Request(
    new URL(`/_v/${BUILD_VERSION}${pathname}${url.search}`, url.origin)
  );
  const cachedResponse = await cache.match(cacheKey);

  // HIT - return immediately
  if (cachedResponse) {
    const headers = new Headers(cachedResponse.headers);
    return new Response(cachedResponse.body, {
      status: cachedResponse.status,
      statusText: cachedResponse.statusText,
      headers,
    });
  }

  // MISS - stream response immediately, cache in background.
  // Note: Cache-Tag header on MISS responses may be incomplete because tags
  // are collected via addTags() as components render during streaming. The full
  // set of tags is only available after the body is fully consumed in cacheWork.
  // The cached entry will have the complete Cache-Tag. Buffering the body before
  // returning would fix this but would sacrifice streaming on cache misses.
  const now = performance.now();
  const originalResponse = await next();
  const end = performance.now();
  console.log(`[cacheMiddleware] response generated in ${end - now}ms for ${pathname}`);

  const cacheControl = originalResponse.headers.get("Cache-Control");
  const shouldCache =
    !(
      cacheControl?.includes("private") || cacheControl?.includes("no-store")
    ) &&
    originalResponse.status >= 200 &&
    originalResponse.status < 300;

  if (!shouldCache) {
    const headers = new Headers(originalResponse.headers);
    headers.set("X-Cache", "SKIP");
    return new Response(originalResponse.body, {
      status: originalResponse.status,
      statusText: originalResponse.statusText,
      headers,
    });
  }

  // Clone for caching, return original immediately
  const responseToCache = originalResponse.clone();

  // Add X-Cache header and return immediately
  const headers = new Headers(originalResponse.headers);
  headers.set("X-Cache", "MISS");

  // Defer all caching work to waitUntil, re-entering ALS context
  const cacheWork = (store: RequestContext) =>
    requestContext.run(store, async () => {
      // Consume body - streaming completes, components render, tags collected
      const body = await responseToCache.arrayBuffer();

      // Now tags are complete
      const contextTags = getTags();

      const cacheHeaders = new Headers(responseToCache.headers);

      if (!cacheHeaders.has("Cache-Control")) {
        cacheHeaders.set(
          "Cache-Control",
          "public, max-age=0, s-maxage=31536000"
        );
      }

      // Merge Cache-Tag from response header + collected tags
      const responseTags = cacheHeaders.get("Cache-Tag");
      const allTags = new Set<string>(contextTags ?? []);

      if (responseTags) {
        for (const tag of responseTags.split(",")) {
          allTags.add(tag.trim());
        }
      }

      if (allTags.size) {
        cacheHeaders.set("Cache-Tag", [...allTags].join(","));
      }

      const finalResponse = new Response(body, {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers: cacheHeaders,
      });

      await cache.put(cacheKey, finalResponse);
    });

  // Capture ALS store to re-enter context in waitUntil
  const contextStore = requestContext.getStore();

  if (contextStore) {
    if (ctx?.waitUntil) {
      ctx.waitUntil(cacheWork(contextStore));
    } else {
      await cacheWork(contextStore);
    }
  }

  return new Response(originalResponse.body, {
    status: originalResponse.status,
    statusText: originalResponse.statusText,
    headers,
  });
});

export const onRequest = sequence(
  contextMiddleware,
  countryCodeMiddleware,
  cachingMiddleware
);
