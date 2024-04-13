import { CacheTagStore, ObjectCache } from "./cache";

const constructCacheUrl = (key: string) => {
  return `http://cache/${key}`;
};

export function createCfCacheObjectCacheProvider(
  cache: Cache | Promise<Cache>
): ObjectCache {
  return {
    async get(key) {
      const resolvedCache = await cache;
      const response = await resolvedCache.match(constructCacheUrl(key));
      if (response) {
        return {
          found: true,
          data: await response.json(),
        };
      }
      return {
        found: false,
      };
    },
    async set(key, value, duration) {
      const resolvedCache = await cache;
      const response = new Response(JSON.stringify(value), {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": `public, max-age=${duration}`,
        },
      });
      await resolvedCache.put(constructCacheUrl(key), response);
    },
  };
}

export function createCfKvCacheTagStore(kvNamespace: KVNamespace): CacheTagStore {
  return {
    async getTagsCacheKey(tags) {
      const tagDates = await Promise.all(tags.map((tag) => kvNamespace.get(tag)));
      return tagDates.map((date) => date ?? 0).join(",");
    },
    async revalidateTag(tag) {
      await kvNamespace.put(tag, `${+Date.now()}`);
    },
  };
}
