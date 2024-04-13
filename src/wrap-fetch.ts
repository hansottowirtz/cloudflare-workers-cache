import {
  CacheTagStore,
  ObjectCache,
  provideCacheTagStore,
  provideObjectCache,
  provideWaitUntil,
} from "./cache";

export function provideCacheToFetch<Env = unknown>(
  config: {
    objectCache: ObjectCache | ((env: any) => ObjectCache);
    cacheTagStore: CacheTagStore | ((env: any) => CacheTagStore);
  },
  fetch: ExportedHandlerFetchHandler<Env>
) {
  const wrappedFetch: ExportedHandlerFetchHandler<Env> = async (
    request,
    env,
    ctx
  ) => {
    const objectCache =
      typeof config.objectCache === "function"
        ? config.objectCache(env)
        : config.objectCache;
    const cacheTagStore =
      typeof config.cacheTagStore === "function"
        ? config.cacheTagStore(env)
        : config.cacheTagStore;
    return provideWaitUntil(
      (p) => ctx.waitUntil(p),
      () =>
        provideObjectCache(objectCache, () =>
          provideCacheTagStore(cacheTagStore, async () =>
            fetch(request, env, ctx)
          )
        )
    );
  };
  return wrappedFetch;
}
