# 🛍️ Shopify Change Intelligence

![MCP](https://img.shields.io/badge/MCP-Streamable%20HTTP-7c3aed)
![x402](https://img.shields.io/badge/x402-v1%20%2B%20v2-6938ef)
![USDC](https://img.shields.io/badge/settle-USDC%20on%20Base-1f6feb)
![price](https://img.shields.io/badge/from-%240.05%2Fcall-2ea043)

Monitor Shopify stores — products, prices and inventory — and sell the change report to AI agents.

Agents pay **peer-to-peer in USDC on Base** using the native **x402** protocol — no platform account, no payment processor, **0% commission**. You can also use a monthly key. One key works across the [whole Change Intelligence family](https://pixharvest.com).

- **Hosted service:** https://s-shopify.pixharvest.com
- **MCP endpoint:** `https://s-shopify.pixharvest.com/mcp`
- **Official MCP Registry:** `io.github.contentforge-press/shopify-intel`
- **npm:** [`shopify-change-intelligence`](https://www.npmjs.com/package/shopify-change-intelligence)

## Try it now

Open a **free, no-key snapshot**: https://s-shopify.pixharvest.com/v1/snapshot?store=allbirds.com

Target format: `?store=allbirds.com` (a myshopify.com domain or custom domain)

## Tools

| Tool | Price | Returns |
|---|---|---|
| `shopify_snapshot` | Free | Current products, prices and stock for one store |
| `shopify_changes` | $0.05 | New / removed products, price and inventory changes since last fetch |
| `shopify_intel_report` | $0.50 | Competitor summary: assortment, pricing bands, risk flags |
| `shopify_batch_watch` | $0.03 / store | Scan up to 50 stores in one call |
| `shopify_competitive_landscape` | $5 | Rank up to 10 stores on price, assortment and stock |

## One-call install for MCP clients

The npm wrapper prints ready-to-paste MCP config:

```bash
npx -y shopify-change-intelligence
```

Or Add the remote server manually to any MCP client (Claude Desktop, Cursor, Windsurf, …):

```json
{
  "mcpServers": {
    "intel-worker": {
      "url": "https://s-shopify.pixharvest.com/mcp"
    }
  }
}
```

Anonymous `initialize` / `tools/list` are free; paid tool calls return an `x402` challenge.

## Pay-per-call (x402)

Call a paid route without payment and you receive `402 Payment Required` with a machine-readable `PAYMENT-REQUIRED` header (x402 v2) plus a v1 JSON body. The agent signs a USDC authorization, retries with the payment header, and the request settles on Base.

## Monthly plans

Same four tiers on every product — the same access key unlocks all five feeds:

| Hobby | Pro | Business | Enterprise |
|---|---|---|---|
| $9/mo | $99/mo | $499/mo | $2000/mo |

Get a key from the [pricing page](https://s-shopify.pixharvest.com/pricing), then pass it as `?key=...` on any call.

## HTTP quick start

```bash
# free snapshot
curl "https://s-shopify.pixharvest.com/v1/snapshot?store=REPLACE_TARGET"

# paid call — returns 402 with the x402 challenge
curl -i "https://s-shopify.pixharvest.com/v1/changes?store=REPLACE_TARGET"
```

## Links

- Company hub: https://pixharvest.com
- GitHub: https://github.com/contentforge-press
- Contact: contentforge.press@outlook.com

## License

MIT — self-host, modify and run it yourself. The hosted service and its data are provided as-is.
