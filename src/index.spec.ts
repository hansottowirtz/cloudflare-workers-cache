import {
  env,
  createExecutionContext,
  waitOnExecutionContext,
} from "cloudflare:test";
import { describe, it, expect } from "vitest";
import { cache } from "./cache";
import {
  createCfCacheObjectCacheProvider,
  createCfKvCacheTagStore,
} from "./cloudflare-adapters";
import { provideCacheToFetch } from "./wrap-fetch";

declare module "cloudflare:test" {
  interface ProvidedEnv {
    KV: KVNamespace;
  }
}

const slowSum = async (a: number, b: number) => {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  return a + b;
};

const cacheSettings = {
  objectCache: createCfCacheObjectCacheProvider(caches.open("cache")),
  cacheTagStore: createCfKvCacheTagStore(env.KV),
};

function createTestSumWorker(sumFn: (a: number, b: number) => Promise<number>) {
  const sumWorker = {
    fetch: provideCacheToFetch(cacheSettings, async (req) => {
      const qp = new URL(req.url).searchParams;
      const a = +qp.get("a")!;
      const b = +qp.get("b")!;
      const result = await sumFn(a, b);
      return new Response(result.toString());
    }),
  } as ExportedHandler;
  return sumWorker;
}

const cachedSlowSum = cache(slowSum);
const sumWorker = createTestSumWorker(cachedSlowSum);

const cachedSlowSumWithRevalidate = cache(slowSum, [], {
  revalidate: 1,
});
const sumWorkerWithRevalidate = createTestSumWorker(
  cachedSlowSumWithRevalidate
);

const cachedSlowSumWithTags = cache(slowSum, [], {
  tags: ["sum"],
});
const sumWorkerWithTags = createTestSumWorker(cachedSlowSumWithTags);

async function measureWorkerRequest(url: string, worker: ExportedHandler) {
  const ctx = createExecutionContext();
  const t1 = Date.now();
  const response = await worker.fetch!(new Request(url), env, ctx);
  const t2 = Date.now();
  await waitOnExecutionContext(ctx);
  return {
    time: t2 - t1,
    responseText: await response.text(),
  };
}

describe("Cache", () => {
  it("caches the simplest stuff", async () => {
    {
      const result = await measureWorkerRequest(
        "http://sum?a=1&b=2",
        sumWorker
      );
      expect(result.time).toBeGreaterThanOrEqual(990);
      expect(result.responseText).toMatchInlineSnapshot(`"3"`);
    }
    {
      const result = await measureWorkerRequest(
        "http://sum?a=1&b=2",
        sumWorker
      );
      expect(result.time).toBeLessThan(100);
      expect(result.responseText).toMatchInlineSnapshot(`"3"`);
    }
  });

  it("can revalidate", async () => {
    {
      const result = await measureWorkerRequest(
        "http://sum?a=1&b=2",
        sumWorkerWithRevalidate
      );
      expect(result.time).toBeGreaterThan(990);
      expect(result.responseText).toMatchInlineSnapshot(`"3"`);
    }
    {
      const result = await measureWorkerRequest(
        "http://sum?a=1&b=2",
        sumWorkerWithRevalidate
      );
      expect(result.time).toBeLessThan(100);
      expect(result.responseText).toMatchInlineSnapshot(`"3"`);
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
    {
      const result = await measureWorkerRequest(
        "http://sum?a=1&b=2",
        sumWorkerWithRevalidate
      );
      expect(result.time).toBeGreaterThan(990);
      expect(result.responseText).toMatchInlineSnapshot(`"3"`);
    }
  });

  it("can use cache tags", async () => {
    {
      const result = await measureWorkerRequest(
        "http://sum?a=1&b=2",
        sumWorkerWithTags
      );
      expect(result.time).toBeGreaterThan(990);
      expect(result.responseText).toMatchInlineSnapshot(`"3"`);
    }
    {
      const result = await measureWorkerRequest(
        "http://sum?a=1&b=2",
        sumWorkerWithTags
      );
      expect(result.time).toBeLessThan(100);
      expect(result.responseText).toMatchInlineSnapshot(`"3"`);
    }
    await createCfKvCacheTagStore(env.KV).revalidateTag("sum");
    {
      const result = await measureWorkerRequest(
        "http://sum?a=1&b=2",
        sumWorkerWithTags
      );
      expect(result.time).toBeGreaterThan(990);
      expect(result.responseText).toMatchInlineSnapshot(`"3"`);
    }
  });
});
