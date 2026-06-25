import { addTags, getCtx } from "./context";

const BUILD_VERSION = import.meta.env.BUILD_VERSION;

export function withCache<T, Args extends unknown[]>(
  fn: (...args: Args) => Promise<T>,
  tagsOption: string[] | ((...args: Args) => string[])
): (...args: Args) => Promise<T> {
  const fnKey = fn.toString();

  return async (...args: Args): Promise<T> => {
    const tags =
      typeof tagsOption === "function" ? tagsOption(...args) : tagsOption;
    const ctx = getCtx();
    const cache = typeof caches === "undefined" ? undefined : caches.default;
    const key = `v${BUILD_VERSION}-${fnKey}-${tags.join(",")}-${JSON.stringify(args)}`;

    addTags(tags);

    // Skip cache in dev mode
    if (!cache) {
      return await fn(...args);
    }

    const cacheKey = new Request(`https://cache/${key}`);

    // Try cache first
    const cached = await cache.match(cacheKey);
    if (cached) {
      const data = (await cached.json()) as T;
      return data;
    }

    // Execute function
    const data = await fn(...args);

    // Store in cache
    const response = new Response(JSON.stringify(data), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, s-maxage=31536000",
        "Cache-Tag": tags.join(","),
      },
    });

    // Non-blocking cache write
    if (ctx) {
      ctx.waitUntil(cache.put(cacheKey, response));
    } else {
      await cache.put(cacheKey, response);
    }

    return data;
  };
}
