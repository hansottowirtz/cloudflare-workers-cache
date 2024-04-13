import { CacheTagStore } from "./cache";

export function createInMemoryObjectCache(): CacheTagStore {
  const cacheTagDates = new Map<string, number>();
  const inMemoryCacheTagStore: CacheTagStore = {
    async getTagsCacheKey(tags) {
      return tags.map((tag) => cacheTagDates.get(tag) ?? 0).join(",");
    },
    async revalidateTag(tag) {
      console.log(`revalidating tag ${tag}`);
      cacheTagDates.set(tag, +Date.now());
    },
  };
  return inMemoryCacheTagStore;
}
