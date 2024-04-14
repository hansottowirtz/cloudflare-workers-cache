# `unstable_cache` from Next.js for Cloudflare Workers

Cache any JSON-serializable result from an async function. It uses the same API as [`unstable_cache` from Next.js](https://nextjs.org/docs/app/api-reference/functions/unstable_cache).

- Simple wrapper function over [Cloudflare Workers Cache API](https://developers.cloudflare.com/workers/runtime-apis/cache/#accessing-cache).
- Supports time-based and tag-based cache revalidation.
- Stores tag revalidation data in a KV store.
- No need for a Cloudflare Enterprise account for tag revalidation.

```ts
const getUser = (id: number) => sql`SELECT * FROM users WHERE id = ${id}`;

const cachedGetUser = cache(getUser, ["get-user"], {
  tags: ["users"]
  revalidate: 60,
});

// on edit
revalidateTag("users");
```

## Installation

```bash
npm install cloudflare-workers-cache
```

## Usage

```toml
# wrangler.toml
compatibility_flags = ["nodejs_compat"]

kv_namespaces = [{ binding = "CACHE_TAG_STORE", id = "<id>" }]
```

```ts
import {
  cache,
  revalidateTag,
  provideCacheToFetch,
  createCfCacheObjectCache,
  createCfKvCacheTagStore,
} from "cloudflare-workers-cache";

const cacheConfig = {
  objectCache: createCfCacheObjectCache(caches.open("cache")),
  cacheTagStore: (env) => createCfKvCacheTagStore(env.CACHE_TAG_STORE),
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
    }
    const a = +url.searchParams.get("a")!;
    const b = +url.searchParams.get("b")!;
    const result = await cachedSum(a, b);
    return new Response(result.toString());
  }),
}
```

### Write custom caches

By default, the object cache uses Cloudflare Cache, and the tag store uses Cloudflare KV, see [src/cloudflare-adapters.ts](src/cloudflare-adapters.ts). You can write your own implementations by implementing the `ObjectCache` and `CacheTagStore` interfaces.

```ts
const customObjectCache: ObjectCache = {
  async get(key) {
    // ...
  },
  async set(key, value, duration) {
    // ...
  },
}

const customCacheTagStore: CacheTagStore = {
  async getTagsCacheKey(tags) {
    // ...
  },
  async revalidateTag(tag) {
    // ...
  }
}

const cacheConfig: CacheConfig = {
  objectCache: customObjectCache,
  cacheTagStore: customCacheTagStore,
};
```

### TODO

- Allow usage of `Cache-Tag` revalidation for Cloudflare Enterprise customers.
