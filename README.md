# Shopify Change Intelligence

A **zero-dependency** Cloudflare Worker that monitors Shopify stores and sells change intelligence. AI agents pay automatically in **USDC on Base** via the native **x402** protocol — no platform account, no payment processor, 0% commission.

## What it does

- `GET /v1/snapshot?store=allbirds.com` — **free**. Live catalog snapshot (product count, price min/max, availability, variants).
- `GET /v1/changes?store=allbirds.com` — **paid ($0.05 / request)**. Change intelligence vs. the last stored snapshot: new products, removed products, price up/down, inventory restocked/out-of-stock.
- `GET /` — service manifest. `GET /health` — health check.

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

Set your own payout address and price in `src/worker.js` (`PAY_TO`, `PRICE_USD`).

## Notes

- Only public, unauthenticated `/products.json` endpoints are read.
- Payment settlement is independent of discovery: to be found by agents, list the endpoint in x402/MCP directories.
