# `unstable_cache` from Next.js for Cloudflare Workers

```bash
npm install cloudflare-workers-cache
```

```ts
import {
  cache,
  revalidateTag,
  provideCacheToFetch,
  createCfCacheObjectCacheProvider,
  createCfKvCacheTagStore,
} from "cloudflare-workers-cache";

const cacheSettings = {
  objectCache: createCfCacheObjectCacheProvider(caches.open("cache")),
  cacheTagStore: (env) => createCfKvCacheTagStore(env.KV),
};

const cachedSum = cache(sum, ["sum"], {
  tags: ["sum"],
});

export default {
  fetch: provideCacheToFetch(cacheSettings, async (req) => {
    const url = new URL(req.url);
    if (url.pathname === "/revalidate") {
      revalidateTag("sum");
      return new Response("Revalidated");
    }
    const a = +url.searchParams.get("a")!;
    const b = +url.searchParams.get("b")!;
    const result = await cachedSum(a, b);
    return new Response(result.toString());
  }),
} as ExportedHandler;
```