// ---------------------------------------------------------------------------
// Shopify Change Intelligence — independent Cloudflare Worker, x402 paywall.
// Zero third-party deps (native Fetch router). Free snapshot answer; the deep
// change-diff costs USDC on Base, settled P2P to our own wallet.
// ---------------------------------------------------------------------------

const PAY_TO = '0x7B185414974006313E3A23C454fBAD34477FDC25';
const FACILITATOR = 'https://x402.org/facilitator';
const USDC_BASE = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const CHAIN_ID = 8453;
const NETWORK = 'base';

const FREE_MAX_PRODUCTS = 200;
const PRICE_DEEP_USD = 0.05;

const json = (obj, status = 200, extra = {}) => new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json', ...extra },
});

function renderHome() {
    const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Shopify Change Intelligence — x402</title>
<style>
  :root{--bg:#0b0e14;--card:#141925;--line:#222a3a;--fg:#e8ecf4;--mut:#8b95a7;--acc:#5b8cff;--grn:#37d39b}
  *{box-sizing:border-box}
  body{margin:0;font:15px/1.6 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:var(--bg);color:var(--fg)}
  .wrap{max-width:880px;margin:0 auto;padding:48px 22px}
  h1{font-size:30px;margin:0 0 6px}
  .sub{color:var(--mut);margin:0 0 30px}
  .card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:22px;margin:18px 0}
  label{display:block;color:var(--mut);font-size:13px;margin-bottom:8px}
  .row{display:flex;gap:10px;flex-wrap:wrap}
  input{flex:1;min-width:240px;background:#0d1119;border:1px solid var(--line);border-radius:9px;color:var(--fg);padding:12px 14px;font-size:15px}
  button{background:var(--acc);border:0;color:#fff;border-radius:9px;padding:12px 18px;font-size:15px;cursor:pointer;font-weight:600}
  button.ghost{background:transparent;border:1px solid var(--line);color:var(--fg)}
  pre{background:#0a0d14;border:1px solid var(--line);border-radius:9px;padding:14px;overflow:auto;font-size:12.5px;max-height:340px}
  code{color:var(--grn)}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
  @media(max-width:680px){.grid{grid-template-columns:1fr}}
  .pill{display:inline-block;font-size:12px;color:var(--mut);border:1px solid var(--line);border-radius:999px;padding:2px 10px;margin-right:6px}
  a{color:var(--acc)}
  .muted{color:var(--mut);font-size:13.5px}
</style>
</head>
<body>
<div class="wrap">
  <h1>Shopify Change Intelligence</h1>
  <p class="sub">Ask any Shopify store a question. The basic answer is free &nbsp;·&nbsp; the full change report is paid by AI agents in <b>USDC on Base</b> via <b>x402</b> — no signup, no processor.</p>

  <div class="card">
    <label for="store">Try it free — enter a Shopify store domain</label>
    <div class="row">
      <input id="store" value="allbirds.com" placeholder="e.g. allbirds.com" />
      <button onclick="run()">Get free snapshot</button>
    </div>
    <p class="muted" style="margin:14px 0 0">Reads the public <code>/products.json</code> feed. Live count, price range, availability.</p>
    <pre id="out">// result will appear here</pre>
  </div>

  <div class="grid">
    <div class="card">
      <b>Free endpoint</b>
      <p class="muted">Live catalog snapshot</p>
      <code>GET /v1/snapshot?store=allbirds.com</code>
    </div>
    <div class="card">
      <b>Paid endpoint · $0.05 USDC</b>
      <p class="muted">New / removed products, price up/down, restock / out-of-stock vs. history</p>
      <code>GET /v1/changes?store=allbirds.com</code>
    </div>
  </div>

  <div class="card">
    <b>How agents pay</b>
    <p class="muted">Without payment the server returns <code>402</code> with a <code>PAYMENT-REQUIRED</code> header. An x402 agent settles USDC on Base and retries; the worker verifies and settles P2P — 0% commission.</p>
    <div>
      <span class="pill">network · Base (8453)</span>
      <span class="pill">asset · USDC</span>
      <span class="pill">payout · ${PAY_TO.slice(0,6)}…${PAY_TO.slice(-4)}</span>
    </div>
  </div>

  <p class="muted"><a href="/health">health</a> · <a href="/v1">JSON manifest</a></p>
</div>
<script>
async function run(){
  const out=document.getElementById('out');
  const store=encodeURIComponent(document.getElementById('store').value.trim());
  out.textContent='// loading…';
  try{
    const r=await fetch('/v1/snapshot?store='+store);
    const j=await r.json();
    out.textContent=JSON.stringify(j,null,2);
  }catch(e){ out.textContent='// error: '+e.message; }
}
</script>
</body>
</html>`;
    return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } });
}

const normDomain = (raw) => String(raw ?? '')
    .trim().toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/[\/?#].*$/, '');

const toNum = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
};

const b64encode = (obj) => btoa(JSON.stringify(obj));
const b64decode = (s) => JSON.parse(atob(s));

function normalizeProduct(domain, p) {
    const variants = (p.variants ?? []).map((v) => ({
        variantId: v.id,
        title: v.title || '',
        price: toNum(v.price),
        compareAtPrice: toNum(v.compare_at_price),
        available: Boolean(v.available),
    }));
    const prices = variants.map((v) => v.price).filter((x) => x !== null);
    return {
        store: domain,
        productId: p.id,
        handle: p.handle,
        url: `https://${domain}/products/${p.handle}`,
        title: p.title || '',
        vendor: p.vendor || '',
        productType: p.product_type || '',
        updatedAt: p.updated_at || null,
        minPrice: prices.length ? Math.min(...prices) : null,
        available: variants.some((v) => v.available),
        variants,
    };
}

async function fetchProducts(domain, cap) {
    const out = [];
    const seen = new Set();
    for (let page = 1; page <= 10; page++) {
        const url = `https://${domain}/products.json?limit=250&page=${page}`;
        const res = await fetch(url, {
            headers: {
                accept: 'application/json',
                'user-agent': 'shopify-intel/1.0 (+https://x402.org)',
            },
        });
        if (page === 1 && res.status === 404) {
            throw new Error(`${domain} is not a Shopify store (404 on /products.json)`);
        }
        if (!res.ok) {
            if (page > 1 && (res.status === 403 || res.status === 429)) break;
            throw new Error(`HTTP ${res.status} from ${domain}`);
        }
        const data = await res.json();
        const batch = data.products ?? [];
        if (!batch.length) break;
        for (const p of batch) {
            if (seen.has(p.id)) continue;
            seen.add(p.id);
            out.push(normalizeProduct(domain, p));
            if (cap && out.length >= cap) return out;
        }
        if (batch.length < 250) break;
    }
    return out;
}

function diffProducts(prevList, currList) {
    const changes = [];
    const prevMap = new Map(prevList.map((p) => [p.productId, p]));
    const currMap = new Map(currList.map((p) => [p.productId, p]));

    for (const p of currList) {
        if (!prevMap.has(p.productId)) {
            changes.push({ changeType: 'new_product', title: p.title, url: p.url, minPrice: p.minPrice });
        }
    }
    for (const p of prevList) {
        if (!currMap.has(p.productId)) {
            changes.push({ changeType: 'removed_product', title: p.title, url: p.url });
        }
    }
    for (const curr of currList) {
        const prev = prevMap.get(curr.productId);
        if (!prev) continue;
        const prevVariants = new Map(prev.variants.map((v) => [v.variantId, v]));
        for (const cv of curr.variants) {
            const pv = prevVariants.get(cv.variantId);
            if (!pv) continue;
            if (pv.price !== null && cv.price !== null && cv.price !== pv.price) {
                const delta = cv.price - pv.price;
                const pct = pv.price ? (Math.abs(delta) / pv.price) * 100 : 100;
                changes.push({
                    changeType: delta < 0 ? 'price_decreased' : 'price_increased',
                    title: curr.title,
                    variant: cv.title,
                    from: pv.price,
                    to: cv.price,
                    percent: Number(pct.toFixed(2)),
                    url: curr.url,
                });
            }
            if (pv.available !== cv.available) {
                changes.push({
                    changeType: cv.available ? 'back_in_stock' : 'out_of_stock',
                    title: curr.title,
                    variant: cv.title,
                    url: curr.url,
                });
            }
        }
    }
    return changes;
}

// ---- x402 -----------------------------------------------------------------
function buildRequirements(url, priceUsd, description) {
    const atomic = BigInt(Math.round(priceUsd * 1_000_000)).toString();
    return {
        scheme: 'exact',
        network: NETWORK,
        maxAmountRequired: atomic,
        resource: url,
        description,
        mimeType: 'application/json',
        payTo: PAY_TO,
        maxTimeoutSeconds: 600,
        asset: USDC_BASE,
    };
}

const paymentRequired = (requirements) => json(
    { x402Version: 1, error: 'payment_required', accepts: [requirements] },
    402,
    { 'PAYMENT-REQUIRED': b64encode(requirements) },
);

async function verifyAndSettle(paymentHeader, requirements) {
    const paymentPayload = b64decode(paymentHeader);
    const body = { paymentPayload, paymentRequirements: requirements };

    const verifyRes = await fetch(`${FACILITATOR}/verify`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
    });
    const verify = await verifyRes.json();
    if (!verify.isValid) return { ok: false, reason: verify.invalidReason || 'invalid_payment' };

    const settleRes = await fetch(`${FACILITATOR}/settle`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
    });
    const settle = await settleRes.json();
    if (!settle.success) return { ok: false, reason: settle.errorReason || 'unexpected_settle_error' };
    return { ok: true, payer: settle.payer, transaction: settle.transaction };
}

// ---- Route handlers -------------------------------------------------------
async function handleSnapshot(url, env) {
    const store = normDomain(url.searchParams.get('store'));
    if (!store) return json({ error: 'Missing ?store= domain' }, 400);
    try {
        const products = await fetchProducts(store, FREE_MAX_PRODUCTS);
        // Free snapshot also establishes/refreshes the baseline so the next
        // paid /v1/changes call diffs against real history instead of empty.
        const kv = env.INTEL_KV;
        if (kv) await kv.put(`snapshot-${store}`, JSON.stringify({ savedAt: new Date().toISOString(), products }));
        return json({
            store,
            fetchedAt: new Date().toISOString(),
            productCount: products.length,
            capped: products.length >= FREE_MAX_PRODUCTS,
            sample: products.slice(0, 20).map((p) => ({
                title: p.title,
                minPrice: p.minPrice,
                available: p.available,
                url: p.url,
            })),
            note: 'Free snapshot. Deep change history requires /v1/changes.',
        });
    } catch (err) {
        return json({ error: err.message }, 502);
    }
}

async function handleChanges(url, request, env) {
    const store = normDomain(url.searchParams.get('store'));
    if (!store) return json({ error: 'Missing ?store= domain' }, 400);

    const requirements = buildRequirements(url.href, PRICE_DEEP_USD, `Shopify change detection for ${store}`);
    const paymentHeader = request.headers.get('PAYMENT') || request.headers.get('X-PAYMENT');
    if (!paymentHeader) return paymentRequired(requirements);

    let settlement;
    try {
        settlement = await verifyAndSettle(paymentHeader, requirements);
    } catch (err) {
        return json({ error: 'unexpected_verify_error', detail: String(err?.message || err) }, 502);
    }
    if (!settlement.ok) return json({ x402Version: 1, error: settlement.reason }, 402);

    let products;
    try {
        products = await fetchProducts(store, 0);
    } catch (err) {
        return json({ error: err.message }, 502);
    }

    const kv = env.INTEL_KV;
    const key = `snapshot-${store}`;
    const raw = kv ? await kv.get(key, 'json') : null;
    let changes = [];
    let baseline = true;
    if (raw && Array.isArray(raw.products)) {
        baseline = false;
        changes = diffProducts(raw.products, products);
    }
    if (kv) await kv.put(key, JSON.stringify({ savedAt: new Date().toISOString(), products }));

    return json({
        store,
        fetchedAt: new Date().toISOString(),
        productCount: products.length,
        baseline,
        changeCount: changes.length,
        changes,
        settlement: { payer: settlement.payer, transaction: settlement.transaction },
    });
}

async function handleMcp(request, env) {
    if (request.method === 'GET') return json({ jsonrpc: '2.0', error: { code: -32000, message: 'MCP endpoint expects POST' } }, 405);

    let msg;
    try {
        msg = await request.json();
    } catch {
        return json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'parse error' } }, 400);
    }

    const { id, method, params } = msg;
    const reply = (result, extra = {}) => json({ jsonrpc: '2.0', id, result }, 200, extra);
    const rerr = (code, message, extra = {}) => json({ jsonrpc: '2.0', id, error: { code, message } }, 200, extra);
    const toolText = (text, isError = false, extra = {}) => reply({ content: [{ type: 'text', text }], ...(isError ? { isError: true } : {}) }, extra);

    if (method === 'notifications/initialized') return new Response(null, { status: 202 });

    if (method === 'initialize') {
        return reply({
            protocolVersion: '2025-06-18',
            capabilities: { tools: {} },
            serverInfo: { name: 'shopify-change-intelligence', version: '1.0.0' },
        });
    }

    if (method === 'tools/list') {
        return reply({
            tools: [
                {
                    name: 'shopify_snapshot',
                    description: 'FREE. Returns a live snapshot of a public Shopify store: product count, price range, availability and a sample of products. Reads the public /products.json feed.',
                    inputSchema: {
                        type: 'object',
                        properties: { store: { type: 'string', description: 'Shopify domain, e.g. allbirds.com' } },
                        required: ['store'],
                    },
                },
                {
                    name: 'shopify_changes',
                    description: 'PAID ($0.05 USDC on Base via x402). Returns change intelligence vs the last snapshot: new/removed products, price increases/decreases, restock/out-of-stock.',
                    inputSchema: {
                        type: 'object',
                        properties: { store: { type: 'string', description: 'Shopify domain, e.g. allbirds.com' } },
                        required: ['store'],
                    },
                },
            ],
        });
    }

    if (method === 'tools/call') {
        const name = params?.name;
        const store = normDomain(params?.arguments?.store);
        if (!store) return rerr(-32602, 'Missing required argument: store');

        if (name === 'shopify_snapshot') {
            try {
                const products = await fetchProducts(store, FREE_MAX_PRODUCTS);
                const kv = env.INTEL_KV;
                if (kv) await kv.put(`snapshot-${store}`, JSON.stringify({ savedAt: new Date().toISOString(), products }));
                const prices = products.map((p) => p.minPrice).filter((x) => x !== null);
                return toolText(JSON.stringify({
                    store,
                    productCount: products.length,
                    priceRange: prices.length ? { min: Math.min(...prices), max: Math.max(...prices) } : null,
                    inStock: products.filter((p) => p.available).length,
                    sample: products.slice(0, 10).map((p) => ({ title: p.title, minPrice: p.minPrice, available: p.available, url: p.url })),
                }, null, 2));
            } catch (err) {
                return toolText(`error: ${err.message}`, true);
            }
        }

        if (name === 'shopify_changes') {
            const requirements = buildRequirements(new URL(request.url).href, PRICE_DEEP_USD, `Shopify change detection for ${store}`);
            const paymentHeader = request.headers.get('PAYMENT') || request.headers.get('X-PAYMENT');
            if (!paymentHeader) {
                return toolText(
                    `This tool costs $${PRICE_DEEP_USD} USDC on Base via the x402 protocol. Pay to ${PAY_TO} and retry the call carrying the x402 payment in the PAYMENT header. See the PAYMENT-REQUIRED response header for the machine-readable challenge.`,
                    true,
                    { 'PAYMENT-REQUIRED': b64encode(requirements) },
                );
            }
            let settlement;
            try {
                settlement = await verifyAndSettle(paymentHeader, requirements);
            } catch (err) {
                return toolText(`verify error: ${err.message}`, true);
            }
            if (!settlement.ok) return toolText(`payment rejected: ${settlement.reason}`, true);

            try {
                const products = await fetchProducts(store, 0);
                const kv = env.INTEL_KV;
                const key = `snapshot-${store}`;
                const raw = kv ? await kv.get(key, 'json') : null;
                let changes = [];
                let baseline = true;
                if (raw && Array.isArray(raw.products)) {
                    baseline = false;
                    changes = diffProducts(raw.products, products);
                }
                if (kv) await kv.put(key, JSON.stringify({ savedAt: new Date().toISOString(), products }));
                return toolText(JSON.stringify({
                    store,
                    productCount: products.length,
                    baseline,
                    changeCount: changes.length,
                    changes,
                    settlement: { payer: settlement.payer, transaction: settlement.transaction },
                }, null, 2));
            } catch (err) {
                return toolText(`error: ${err.message}`, true);
            }
        }

        return rerr(-32601, `Unknown tool: ${name}`);
    }

    return rerr(-32601, `Method not found: ${method}`);
}

function renderGlama() {
    return json({
        $schema: 'https://glama.ai/mcp/schemas/connector.json',
        maintainers: [{ email: 'contentforge.press@outlook.com' }],
    });
}

function renderWellKnown() {
    return json({
        x402Version: 1,
        network: NETWORK,
        chainId: CHAIN_ID,
        payTo: PAY_TO,
        assets: {
            [NETWORK]: {
                address: USDC_BASE,
                symbol: 'USDC',
                decimals: 6,
            },
        },
        facilitator: {
            baseUrl: FACILITATOR,
            endpoints: { verify: '/verify', settle: '/settle', supported: '/supported' },
            kinds: ['exact'],
        },
        resources: [
            {
                url: '/v1/changes',
                description: 'Shopify change intelligence: new/removed products, price changes, restock/out-of-stock vs. history.',
                method: 'GET',
                mimeType: 'application/json',
                price: `${PRICE_DEEP_USD} USDC`,
                scheme: 'exact',
            },
        ],
    });
}

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const { pathname } = url;

        if (pathname === '/') return renderHome();
        if (pathname === '/v1') {
            return json({
                service: 'Shopify Change Intelligence',
                chain: `Base (chainId ${CHAIN_ID})`,
                payTo: PAY_TO,
                endpoints: {
                    free: '/v1/snapshot?store=allbirds.com',
                    paid: '/v1/changes?store=allbirds.com',
                    health: '/health',
                },
                pricing: { snapshot: 'free', deepChanges: `$${PRICE_DEEP_USD} in USDC` },
            });
        }
        if (pathname === '/health') return json({ ok: true, time: new Date().toISOString() });
        if (pathname === '/.well-known/x402') return renderWellKnown();
        if (pathname === '/.well-known/glama.json') return renderGlama();
        if (pathname === '/mcp') return handleMcp(request, env);
        if (pathname === '/v1/snapshot') return handleSnapshot(url, env);
        if (pathname === '/v1/changes') return handleChanges(url, request, env);

        return json({ error: 'not_found' }, 404);
    },
};
