# Shopify Change Intelligence

A remote **MCP (Model Context Protocol)** server that monitors any **public Shopify store**. Free live catalog snapshot; paid change intelligence and competitor reports settled in **USDC on Base via [x402](https://x402.org)** — no API key, no account, no subscription.

> The server runs remotely. This npm package distributes the client configuration; nothing runs locally.

## Quick start

Print the client config:

```bash
npx shopify-change-intelligence
```

Then add the server to any MCP client (Claude Desktop, Cursor, Cline, VS Code, etc.):

```json
{
  "mcpServers": {
    "shopify-change-intelligence": {
      "type": "streamableHttp",
      "url": "https://shopify-intel.contentforge-press.workers.dev/mcp"
    }
  }
}
```

Endpoint URL: `https://shopify-intel.contentforge-press.workers.dev/mcp`

## Tools

| Tool | Price | What it returns |
| --- | --- | --- |
| `shopify_snapshot` | free | Live catalog snapshot: product count, price range, in-stock stats |
| `shopify_changes` | $0.05 | New/removed products, price moves, restock/out-of-stock vs history |
| `shopify_intel_report` | $0.50 | Price bands, biggest moves, stock signals, executive takeaways |
| `shopify_batch_watch` | $0.03 / store | Watch up to 50 stores in one call |
| `shopify_landscape` | $5 | Strategic competitive landscape across up to 10 stores |

When a paid tool is called without payment, the server returns HTTP `402` with an x402 payment payload. An x402-capable agent settles USDC on Base and retries automatically.

## HTTP endpoints

- Free snapshot: `GET https://shopify-intel.contentforge-press.workers.dev/v1/snapshot?store=allbirds.com`
- Free embeddable widget: `https://shopify-intel.contentforge-press.workers.dev/embed`

## License

MIT
