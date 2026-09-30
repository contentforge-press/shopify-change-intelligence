# Shopify Change Intelligence

A **zero-dependency** Cloudflare Worker that monitors Shopify stores and sells change intelligence. AI agents pay automatically in **USDC on Base** via the native **x402** protocol — no platform account, no payment processor, 0% commission.

**npm:** [`shopify-change-intelligence`](https://www.npmjs.com/package/shopify-change-intelligence) — `npx shopify-change-intelligence` prints the MCP client config for the hosted server.

## What it does

Four tiers, from free data to a distilled answer:

- `GET /v1/snapshot?store=allbirds.com` — **free**. Live catalog snapshot (count, price range, availability).
- `GET /v1/changes?store=allbirds.com` — **$0.05**. Raw change list vs. the last stored snapshot: new/removed products, price up/down, restock/out-of-stock.
- `GET /v1/intel?store=allbirds.com` — **$0.50** ⭐. Full-catalog competitor intelligence report: price bands, median/range, top discounts & hikes, stock signals and auto-generated executive takeaways.
- `POST /v1/batch` — **$0.03 / store** (max 50). Body `{"stores":["a.com","b.com"]}`; watches a whole competitor set in one call and returns per-store change counts.
- `GET /mcp` — MCP (JSON-RPC over Streamable HTTP) exposing all four as tools. `GET /` — landing page. `GET /v1` — JSON manifest. `GET /health` — health check.

When a paid route is called without payment the server returns `402 Payment Required` with a base64-encoded `PAYMENT-REQUIRED` header. An x402-capable agent fetches a USDC settlement, re-sends it in the `PAYMENT` header, and the worker verifies and settles it through the Coinbase x402 facilitator.

## Architecture

- **Runtime:** Cloudflare Workers (native `fetch`, no frameworks, no npm dependencies).
- **Settlement:** x402 protocol, Base mainnet (chainId 8453), USDC `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`.
- **Facilitator:** `https://x402.org/facilitator` (`/verify`, `/settle`).
- **Storage (optional):** Workers KV namespace `INTEL_KV` for historical snapshots. Without it the worker still runs; the free snapshot is always live and change detection reports against an empty baseline.

## Deploy

```bash
npm i -g wrangler
wrangler login
wrangler kv namespace create INTEL_KV   # copy id into wrangler.toml
wrangler deploy
```

Set your own payout address and prices in `src/worker.js` (`PAY_TO`, `PRICE_DEEP_USD`, `PRICE_INTEL_USD`, `PRICE_PER_STORE_USD`).

## Notes

- Only public, unauthenticated `/products.json` endpoints are read.
- Payment settlement is independent of discovery: to be found by agents, list the endpoint in x402/MCP directories.
