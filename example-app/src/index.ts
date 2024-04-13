/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

export interface Env {
	// Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
	CACHE_TAGS_STORE: KVNamespace;
	//
	// Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
	// MY_DURABLE_OBJECT: DurableObjectNamespace;
	//
	// Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
	// MY_BUCKET: R2Bucket;
	//
	// Example binding to a Service. Learn more at https://developers.cloudflare.com/workers/runtime-apis/service-bindings/
	// MY_SERVICE: Fetcher;
	//
	// Example binding to a Queue. Learn more at https://developers.cloudflare.com/queues/javascript-apis/
	// MY_QUEUE: Queue;
}

import {
  cache,
  revalidateTag,
  provideCacheToFetch,
  createCfCacheObjectCacheProvider,
  createCfKvCacheTagStore,
} from "../../src/index";

const cacheSettings = {
  objectCache: createCfCacheObjectCacheProvider(caches.open("cache")),
  cacheTagStore: (env: Env) => createCfKvCacheTagStore(env.CACHE_TAGS_STORE),
};

const sum = async (a: number, b: number) => {
	await new Promise((resolve) => setTimeout(resolve, 1000));
	return a + b;
}

const cachedSum = cache(sum, ["sum"], {
  tags: ["sum"],
});

export default {
  fetch: provideCacheToFetch(cacheSettings, async (req) => {
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
