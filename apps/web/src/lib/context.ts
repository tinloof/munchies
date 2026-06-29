import { AsyncLocalStorage } from "node:async_hooks";
import type { Runtime } from "@astrojs/cloudflare";
import type { AstroCookies } from "astro";

type Ctx = Runtime["cfContext"];

export interface RequestContext {
  ctx: Ctx;
  cookies: AstroCookies;
  tags: Set<string>;
}

export const requestContext = new AsyncLocalStorage<RequestContext>();

export const getCtx = () => requestContext.getStore()?.ctx;
export const getCookies = () => requestContext.getStore()?.cookies;
export const getTags = () => requestContext.getStore()?.tags;

export function addTags(tags: string[]) {
  const store = requestContext.getStore();

  if (store) {
    for (const tag of tags) {
      store.tags.add(tag);
    }
  }
}
