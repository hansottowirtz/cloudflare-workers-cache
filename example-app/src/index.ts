export interface Env {
  CACHE_TAG_STORE: KVNamespace;
}

import {
  cache,
  revalidateTag,
  provideCacheToFetch,
  createCfCacheObjectCache,
  createCfKvCacheTagStore,
  type CacheConfig,
} from "../../src/index";

const cacheConfig: CacheConfig<Env> = {
  objectCache: createCfCacheObjectCache(caches.open("cache")),
  cacheTagStore: (env) => createCfKvCacheTagStore(env.CACHE_TAG_STORE),
};

const sum = async (a: number, b: number) => {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  return a + b;
};

const cachedSum = cache(sum, ["sum"], {
  tags: ["sum"],
});

export default {
  fetch: provideCacheToFetch(cacheConfig, async (req) => {
    const url = new URL(req.url);
    if (url.pathname === "/revalidate") {
      revalidateTag("sum");
      return new Response("Revalidated");
    } else if (url.pathname === "/sum") {
      const a = +url.searchParams.get("a")!;
      const b = +url.searchParams.get("b")!;
      const result = await cachedSum(a, b);
      return new Response(result.toString());
    }
    return new Response("Not found", { status: 404 });
  }),
} as ExportedHandler<Env>;
