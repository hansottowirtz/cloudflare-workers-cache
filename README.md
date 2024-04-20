# `unstable_cache` from Next.js for Cloudflare Workers

Cache any JSON-serializable result from an async function. It uses the same API as [`unstable_cache` from Next.js](https://nextjs.org/docs/app/api-reference/functions/unstable_cache).

- Simple wrapper function over the [Cloudflare Workers Cache API](https://developers.cloudflare.com/workers/runtime-apis/cache/#accessing-cache).
- Supports time-based and tag-based cache revalidation.
- Stores tag revalidation data in a KV store.
- No need for a Cloudflare Enterprise account for tag revalidation.

```ts
const getUser = (id: number) => sql`SELECT * FROM users WHERE id = ${id}`;

const cachedGetUser = cache(getUser, ["get-user"], {
  tags: ["users"],
  revalidate: 60,
});

// on edit
revalidateTag("users");
```

## Installation

```bash
npm install cloudflare-workers-cache
```

## Setup

First, create a kv namespace:

```bash
wrangler kv:namespace create CACHE_TAG_STORE
```

Then, adjust your `wrangler.toml`:

```toml
compatibility_flags = ["nodejs_compat"] # needed because this library uses AsyncLocalStorage

kv_namespaces = [{ binding = "CACHE_TAG_STORE", id = "..." }] # copy this from the output of the previous command
```

## Usage

See [example-app/src/index.ts](example-app/src/index.ts) for a fully working example.

```ts
import {
  cache,
  revalidateTag,
  provideCacheToFetch,
  createCfCacheObjectCache,
  createCfKvCacheTagStore,
} from "cloudflare-workers-cache";

// cache an async function
const cachedSum = cache(sum, ["sum"], {
  tags: ["sum"],
});

// configure which object cache and cache tag store to use
const cacheConfig = {
  objectCache: createCfCacheObjectCache(caches.open("cache")),
  cacheTagStore: (env) => createCfKvCacheTagStore(env.CACHE_TAG_STORE),
};

export default {
  fetch: provideCacheToFetch(cacheConfig, async (req) => {
    const url = new URL(req.url);
    if (url.pathname === "/sum") {
      const a = +url.searchParams.get("a")!;
      const b = +url.searchParams.get("b")!;
      const result = await cachedSum(a, b);
      return new Response(result.toString());
    } else if (url.pathname === "/revalidate") {
      revalidateTag("sum");
      return new Response("Revalidated");
    }
    return new Response("Not found", { status: 404 });
  }),
}
```

## API

### `cache(fn, keyParts, options)`

Cache the result of an async function. Same API as [`unstable_cache` from Next.js](https://nextjs.org/docs/app/api-reference/functions/unstable_cache).

- `fn`: The async function to cache.
- `keyParts`: The combination of the function arguments and `keyParts` create the cache key.
- `options`:
  - `tags`: Tags which can be used in `revalidateTag`.
  - `revalidate`: Time in seconds after which the cache should be revalidated.

### `revalidateTag(tag)`

Revalidate all cache entries with the given tag. Revalidation occurs on the next function call.

### `provideCacheToFetch(cacheConfig, handler)`

Wrap a fetch handler with the cache configuration.

Alternatively, you can use `provideWaitUntil`, `provideObjectCache`, `provideCacheTagStore` to set async contexts separately. See [src/wrap-fetch.ts](src/wrap-fetch.ts).

### `createCfCacheObjectCache(cache)`

Create an object cache using the Cloudflare Cache.

### `createCfKvCacheTagStore(kvNamespace)`

Create a cache tag store using a Cloudflare KV store.

## Write custom cache stores

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

## TODO

- Allow usage of `Cache-Tag` revalidation for Cloudflare Enterprise customers.
