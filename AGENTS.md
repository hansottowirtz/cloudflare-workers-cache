## Cursor Cloud specific instructions

This is a Yarn 4 workspaces monorepo for `cloudflare-workers-cache`, a caching library for Cloudflare Workers. The `example-app/` workspace is a demo Worker that consumes the library from source.

### Quick reference

| Action | Command | Notes |
|---|---|---|
| Install deps | `yarn install` | Corepack must be enabled (`corepack enable`) |
| Type check | `npx tsc --noEmit` | |
| Test | `yarn test --run` | Uses `@cloudflare/vitest-pool-workers` (miniflare/workerd); no Cloudflare account needed |
| Build | `yarn build` | Produces CJS + ESM + `.d.ts` in `dist/` |
| Run example app | `cd example-app && yarn dev` | Starts wrangler dev on `http://localhost:8787` |

### Non-obvious caveats

- Vitest is pinned to exactly `1.3.0` because `@cloudflare/vitest-pool-workers` requires that specific version.
- The first time `wrangler dev` runs, it prompts interactively about telemetry metrics. In non-interactive contexts, send `n` followed by Enter to dismiss it, or set `send_metrics = false` in `wrangler.toml`.
- The root `wrangler.toml` uses a placeholder KV namespace ID (`YOUR_KV_NAMESPACE_ID`); this is fine for tests since miniflare emulates KV locally.
- The example app imports from `../../src/index` (library source), not the built `dist/`. No build step is required before running it.
