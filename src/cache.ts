import { AsyncLocalStorage } from "node:async_hooks";
import assert from "node:assert";

const waitUntilALS = new AsyncLocalStorage<(promise: Promise<any>) => void>();
const objectCacheALS = new AsyncLocalStorage<ObjectCache>();
const cacheTagStoreALS = new AsyncLocalStorage<CacheTagStore>();

export const provideWaitUntil = waitUntilALS.run.bind(waitUntilALS);
export const provideObjectCache = objectCacheALS.run.bind(objectCacheALS);
export const provideCacheTagStore = cacheTagStoreALS.run.bind(cacheTagStoreALS);

const consumeWaitUntil = () => {
  const waitUntil = waitUntilALS.getStore();
  assert(waitUntil, "waitUntil not set");
  return waitUntil;
};
const consumeObjectCache = () => {
  const objectCache = objectCacheALS.getStore();
  assert(objectCache, "objectCache not set");
  return objectCache;
};
const consumeCacheTagStore = () => {
  const cacheTagStore = cacheTagStoreALS.getStore();
  assert(cacheTagStore, "cacheTagStore not set");
  return cacheTagStore;
};

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

const YEAR_IN_SECONDS = 60 * 60 * 24 * 365;
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
    const waitUntil = consumeWaitUntil();
    const objectCache = consumeObjectCache();
    const cacheTagStore = consumeCacheTagStore();

    const invocationKey = `${fixedKey}-${JSON.stringify(args)}`;
    const tagsCacheKey = options.tags
      ? await cacheTagStore.getTagsCacheKey(options.tags)
      : "";
    const totalCacheKey = `${tagsCacheKey}-${invocationKey}`;

    const cachedResult = await objectCache.get(totalCacheKey);
    if (cachedResult.found) return cachedResult.data;

    const result = await cb(...args);
    waitUntil(
      objectCache.set(
        totalCacheKey,
        result,
        options.revalidate !== false ? options.revalidate ?? YEAR_IN_SECONDS : 0
      )
    );

    return result;
  };

  return cachedCb as any as T;
}

export const revalidateTag = (tag: string) => {
  const cacheTagStore = consumeCacheTagStore();
  const waitUntil = consumeWaitUntil();
  waitUntil(cacheTagStore.revalidateTag(tag));
};
