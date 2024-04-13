import { AsyncLocalStorage } from "node:async_hooks";
import assert from "node:assert";

const waitUntilALS = new AsyncLocalStorage<(promise: Promise<any>) => void>();
const objectCacheALS = new AsyncLocalStorage<ObjectCache>();
const cacheTagStoreALS = new AsyncLocalStorage<CacheTagStore>();

export const provideWaitUntil = waitUntilALS.run.bind(waitUntilALS);
export const provideObjectCache = objectCacheALS.run.bind(objectCacheALS);
export const provideCacheTagStore = cacheTagStoreALS.run.bind(cacheTagStoreALS);

export type ObjectCache = {
  get: (key: string) => Promise<
    | {
        found: true;
        data: any;
      }
    | {
        found: false;
        data?: any;
      }
  >;
  set: (key: string, value: any, duration: number) => Promise<void>;
};

export type CacheTagStore = {
  revalidateTag: (tag: string) => Promise<void>;
  getTagsCacheKey: (tags: string[]) => Promise<string>;
};

export function cache<T extends (...args: any[]) => Promise<any>>(
  cb: T,
  keyParts?: string[],
  options: {
    revalidate?: number | false;
    tags?: string[];
  } = {}
) {
  const fixedKey = `${cb.toString()}-${
    Array.isArray(keyParts) && keyParts.join(",")
  }`;

  const cachedCb = async (...args: any[]) => {
    const waitUntil = waitUntilALS.getStore();
    const tagRevalidateCacheProvider = cacheTagStoreALS.getStore();
    const objectCacheProvider = objectCacheALS.getStore();

    assert(tagRevalidateCacheProvider, "cacheProvider not set");
    assert(waitUntil, "waitUntil not set");
    assert(objectCacheProvider, "objectCacheProvider not set");

    const invocationKey = `${fixedKey}-${JSON.stringify(args)}`;
    const tagsCacheKey = options.tags
      ? await tagRevalidateCacheProvider.getTagsCacheKey(options.tags)
      : "";
    const totalCacheKey = `${tagsCacheKey}-${invocationKey}`;

    const cachedResult = await objectCacheProvider.get(totalCacheKey);
    if (cachedResult.found) return cachedResult.data;

    const result = await cb(...args);
    waitUntil(
      objectCacheProvider.set(
        totalCacheKey,
        result,
        options.revalidate !== false ? options.revalidate ?? 60 : 0
      )
    );

    return result;
  };

  return cachedCb as any as T;
}

export const revalidateTag = (tag: string) => {
  const cacheTagStore = cacheTagStoreALS.getStore();
  const waitUntil = waitUntilALS.getStore();
  assert(cacheTagStore, "cacheTagStore not set");
  assert(waitUntil, "waitUntil not set");
  waitUntil(cacheTagStore.revalidateTag(tag));
}