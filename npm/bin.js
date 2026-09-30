#!/usr/bin/env node
// shopify-change-intelligence — remote MCP server installer helper
// The server itself is hosted (Streamable HTTP); this package only distributes
// the client config so `npx shopify-change-intelligence` prints ready-to-paste JSON.

const CONFIG = {
  mcpServers: {
    "shopify-change-intelligence": {
      type: "streamableHttp",
      url: "https://shopify-intel.contentforge-press.workers.dev/mcp"
    }
  }
};

const HELP = `Shopify Change Intelligence — remote MCP server
(Monitor any public Shopify store: free snapshot; paid change intelligence in USDC via x402 on Base)

Usage:
  npx shopify-change-intelligence            print MCP client config JSON
  npx shopify-change-intelligence --url      print the endpoint URL only
  npx shopify-change-intelligence --tools    list the MCP tools

Tools:
  shopify_snapshot       free  - live catalog snapshot (count, price range, stock)
  shopify_changes        $0.05 - new/removed products, price moves, stock changes
  shopify_intel_report   $0.50 - competitor intelligence report
  shopify_batch_watch    $0.03/store - watch up to 50 stores in one call
  shopify_landscape      $5    - strategic competitive landscape (up to 10 stores)
`;

const arg = process.argv[2];
if (arg === "--url") {
  console.log(CONFIG.mcpServers["shopify-change-intelligence"].url);
} else if (arg === "--tools") {
  console.log(HELP.split("\n").filter(l => l.startsWith("  shopify_")).join("\n"));
} else if (arg === "--help" || arg === "-h") {
  console.log(HELP);
} else {
  console.log(JSON.stringify(CONFIG, null, 2));
}
