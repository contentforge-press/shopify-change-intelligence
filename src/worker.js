// ---------------------------------------------------------------------------
// Shopify Change Intelligence — independent Cloudflare Worker, x402 paywall.
// Zero third-party deps (native Fetch router). Free snapshot answer; the deep
// change-diff costs USDC on Base, settled P2P to our own wallet.
// ---------------------------------------------------------------------------

const PAY_TO = '0x4873108b2280b7f3EF8cD70cEca3aaBD385f8D6C';
const FACILITATOR = 'https://x402.org/facilitator';
const USDC_BASE = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const CHAIN_ID = 8453;
const NETWORK = 'base';

const FREE_MAX_PRODUCTS = 200;
const PRICE_DEEP_USD = 0.05;
const PRICE_INTEL_USD = 0.50;
const PRICE_PER_STORE_USD = 0.03;
const BATCH_MAX_STORES = 50;
const PRICE_LANDSCAPE_USD = 5;
const LANDSCAPE_MAX_STORES = 10;
const ADMIN_KEY = 'ba951afdb936eecd4ffb9ddfb1b44b25f47bbab1dfc391ac';
const ROBOTS_TXT = "User-agent: *\nAllow: /\nDisallow: /v1/admin/\n\nSitemap: https://shopify-intel.contentforge-press.workers.dev/sitemap.xml\n";
const LLMS_TXT = "# Shopify Change Intelligence\n\n> Monitor any public Shopify store. Free live snapshot; paid change intelligence and competitor reports in USDC via x402 on Base.\n\n- Endpoint (MCP, Streamable HTTP): https://shopify-intel.contentforge-press.workers.dev/mcp\n- Free snapshot: https://shopify-intel.contentforge-press.workers.dev/v1/snapshot?store=allbirds.com\n- x402 discovery: https://shopify-intel.contentforge-press.workers.dev/.well-known/x402\n- Embed a free store widget: https://shopify-intel.contentforge-press.workers.dev/embed\n\n## Tools (MCP)\n- shopify_snapshot: free live catalog snapshot (product count, price range, stock)\n- shopify_changes: $0.05 — new/removed products, price moves, restock/out-of-stock vs history\n- shopify_intel_report: $0.50 — full-catalog competitor report with takeaways\n- shopify_batch_watch: $0.03 per store — watch up to 50 stores in one call\n- shopify_landscape: $5 — strategic competitive landscape across up to 10 stores\n\nPaid tools settle USDC on Base using x402; no API key or account needed to discover or call.\n";
const SITEMAP_XML = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n  <url><loc>https://shopify-intel.contentforge-press.workers.dev/</loc></url>\n  <url><loc>https://shopify-intel.contentforge-press.workers.dev/embed</loc></url>\n  <url><loc>https://shopify-intel.contentforge-press.workers.dev/mcp</loc></url>\n</urlset>\n";

const WIDGET_JS = `/*! Shopify Change Intelligence — embeddable store widget | MIT */
(function () {
  'use strict';
  var API = 'https://shopify-intel.contentforge-press.workers.dev';
  var css = ''
    + '.sci-card{font:14px/1.5 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;'
    + 'background:#fff;color:#16202e;border:1px solid #e3e8ef;border-radius:14px;'
    + 'padding:16px;max-width:320px;box-sizing:border-box}'
    + '.sci-card *{box-sizing:border-box}'
    + '.sci-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:12px}'
    + '.sci-store{font-weight:700;font-size:14px;word-break:break-all}'
    + '.sci-dot{width:8px;height:8px;border-radius:50%;background:#22c55e;flex:none}'
    + '.sci-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px}'
    + '.sci-stat{background:#f6f8fb;border:1px solid #eef1f6;border-radius:10px;padding:8px 10px}'
    + '.sci-num{font-size:18px;font-weight:700;line-height:1.2}'
    + '.sci-lbl{font-size:11px;color:#667085;margin-top:1px}'
    + '.sci-foot{display:flex;align-items:center;justify-content:space-between;gap:8px;'
    + 'border-top:1px solid #eef1f6;padding-top:10px;font-size:12px}'
    + '.sci-foot a{color:#2f6fed;text-decoration:none;font-weight:600}'
    + '.sci-alert{color:#2f6fed;text-decoration:none;font-weight:600}'
    + '.sci-err{font-size:13px;color:#b42318}';

  function inject() {
    if (document.getElementById('sci-style')) return;
    var s = document.createElement('style');
    s.id = 'sci-style';
    s.textContent = css;
    (document.head || document.documentElement).appendChild(s);
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function render(host, d) {
    host.innerHTML = '';
    if (d.error) {
      host.appendChild(el('div', 'sci-err', 'Live store data unavailable.'));
      return;
    }
    var card = el('div', 'sci-card');
    var head = el('div', 'sci-head');
    var name = el('div', 'sci-store', d.store);
    head.appendChild(name);
    head.appendChild(el('span', 'sci-dot'));
    card.appendChild(head);

    var grid = el('div', 'sci-grid');
    [
      [d.productCount, 'products'],
      [d.inStock, 'in stock'],
      [d.outOfStock, 'out of stock'],
      ['$' + (d.minPrice != null ? d.minPrice : '–'), 'from'],
    ].forEach(function (p) {
      var st = el('div', 'sci-stat');
      st.appendChild(el('div', 'sci-num', p[0]));
      st.appendChild(el('div', 'sci-lbl', p[1]));
      grid.appendChild(st);
    });
    card.appendChild(grid);

    var foot = el('div', 'sci-foot');
    var powered = document.createElement('a');
    powered.href = API + '/?utm_source=widget&utm_medium=embed&utm_store=' + encodeURIComponent(d.store);
    powered.target = '_blank';
    powered.rel = 'noopener';
    powered.textContent = 'Shopify Change Intelligence';
    foot.appendChild(powered);
    var alert = document.createElement('a');
    alert.className = 'sci-alert';
    alert.href = API + '/?utm_source=widget&utm_medium=cta&utm_store=' + encodeURIComponent(d.store);
    alert.target = '_blank';
    alert.rel = 'noopener';
    alert.textContent = 'Get change alerts →';
    foot.appendChild(alert);
    card.appendChild(foot);
    host.appendChild(card);
  }

  function loadOne(host) {
    var store = host.getAttribute('data-store');
    if (!store) return;
    fetch(API + '/v1/widget-data?store=' + encodeURIComponent(store))
      .then(function (r) { return r.json(); })
      .then(function (d) { render(host, d); })
      .catch(function () { render(host, { error: true }); });
  }

  function init() {
    inject();
    var nodes = document.querySelectorAll('.sci-widget:not([data-sci-done])');
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].setAttribute('data-sci-done', '1');
      loadOne(nodes[i]);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
`;


// Full-catalog fetch cap for paid tiers (0 = all pages).
const FULL_CAP = 0;

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
  .grid3{grid-template-columns:repeat(3,1fr)}
  @media(max-width:760px){.grid,.grid3{grid-template-columns:1fr}}
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

  <div class="card" style="border-color:var(--acc);background:linear-gradient(180deg,rgba(91,140,255,.10),var(--card))">
    <b>Want continuous monitoring instead of one-off calls?</b>
    <p class="muted">Track competitors, get change alerts and weekly digests from your own dashboard. Plans from <b>$99/month</b> — pay in USDC, access key delivered instantly.</p>
    <div style="margin-top:12px;display:flex;gap:10px;flex-wrap:wrap">
      <a href="/pricing" style="text-decoration:none"><button type="button">See plans &amp; pricing</button></a>
      <a href="/dashboard" style="text-decoration:none"><button type="button" class="ghost" style="background:transparent;color:#cdd9ff">Open dashboard</button></a>
    </div>
  </div>

  <div class="grid grid3">
    <div class="card">
      <b>Free</b>
      <p class="muted">Live catalog snapshot — count, price range, availability</p>
      <code>GET /v1/snapshot?store=…</code>
    </div>
    <div class="card">
      <b>Data · $0.05 USDC</b>
      <p class="muted">Raw change list: new/removed, price up/down, stock vs. history</p>
      <code>GET /v1/changes?store=…</code>
    </div>
    <div class="card" style="border-color:var(--acc)">
      <b>Answer · $0.50 USDC ⭐</b>
      <p class="muted">Competitor intelligence report: price bands, biggest moves, stock signals, executive takeaways</p>
      <code>GET /v1/intel?store=…</code>
    </div>
  </div>

  <div class="card">
    <b>For teams tracking many competitors · $0.03 USDC / store</b>
    <p class="muted">One call watches up to ${BATCH_MAX_STORES} Shopify stores at once and returns each store's change counts. Build for recurring daily/weekly sweeps.</p>
    <code>POST /v1/batch&nbsp;&nbsp;{"stores":["allbirds.com","gymshark.com","…"]}</code>
  </div>

  <div class="card" style="border-color:var(--acc)">
    <b>Strategy · $5 USDC ⭐</b>
    <p class="muted">Competitive landscape across up to ${LANDSCAPE_MAX_STORES} stores — positions your store against peers, flags premium/value players, price-war and stock signals.</p>
    <code>POST /v1/landscape&nbsp;&nbsp;{"stores":[…],"anchor":"yourstore.com"}</code>
  </div>

  <div class="card">
    <b>Free embeddable widget</b>
    <p class="muted">Show live product, price and stock stats on any page — one snippet, auto-updating. <a href="/embed">Get the embed code →</a></p>
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

  <p class="muted"><a href="/pricing">pricing</a> · <a href="/dashboard">dashboard</a> · <a href="/health">health</a> · <a href="/v1">JSON manifest</a> · <a href="/embed">embed widget</a> · <a href="/llms.txt">llms.txt</a></p>
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

// Normalize, then strictly validate a public hostname. Throws on anything
// that could be used for SSRF: raw IPs, loopback/link-local/private ranges,
// credentials, non-standard ports, or malformed labels.
function normDomain(raw) {
    const s = String(raw ?? '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/[\/?#].*$/, '');
    if (!s) throw new Error('empty_domain');
    if (s.includes('@')) throw new Error('credentials_not_allowed');
    if (/:\d+$/.test(s)) throw new Error('port_not_allowed');

    // Reject anything that is or looks like a raw IPv4/IPv6 literal.
    if (s.startsWith('[') || /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(s)) throw new Error('ip_literal_not_allowed');

    // Hostname grammar: labels of a-z0-9/hyphen, no leading/trailing hyphen,
    // and at least one dot so bare hostnames like "localhost" are rejected.
    if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/.test(s)) {
        throw new Error('invalid_domain');
    }
    const tld = s.split('.').pop();
    if (!/^[a-z]{2,}$/.test(tld)) throw new Error('invalid_tld');

    // Defense-in-depth against localhost/private/metadata-style names.
    const blockedLabels = new Set(['localhost', 'internal', 'metadata', 'metadata.google.internal']);
    for (const label of s.split('.')) {
        if (blockedLabels.has(label)) throw new Error('reserved_name_not_allowed');
    }
    return s;
}

// Non-throwing wrapper for request handlers.
const safeNorm = (raw) => { try { return normDomain(raw); } catch { return null; } };

// Fixed-window rate limiter backed by KV. Returns {limited} plus remaining.
async function rateLimit(env, bucket, limit, windowSec) {
    const kv = env.INTEL_KV;
    if (!kv) return { limited: false, remaining: limit };
    const now = Math.floor(Date.now() / 1000);
    const windowStart = now - (now % windowSec);
    const key = `ratelimit-${bucket}-${windowStart}`;
    const current = Number((await kv.get(key)) || 0) + 1;
    await kv.put(key, String(current), { expirationTtl: windowSec + 5 });
    return { limited: current > limit, remaining: Math.max(0, limit - current) };
}

const clientIp = (request) =>
    request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown';

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
            signal: AbortSignal.timeout(15000),
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

// ---- Intel report: turn raw changes into an executive answer --------------
function median(nums) {
    const a = [...nums].sort((x, y) => x - y);
    if (!a.length) return null;
    const m = Math.floor(a.length / 2);
    return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}

function buildIntelReport(store, products, changes, prev, baselineTime, fetchedAt) {
    // All variant prices across the catalog.
    const allPrices = products.flatMap((p) => p.variants.map((v) => v.price)).filter((x) => x !== null);
    const productMinPrices = products.map((p) => p.minPrice).filter((x) => x !== null);

    const buckets = { under25: 0, '25to50': 0, '50to100': 0, '100to200': 0, over200: 0 };
    for (const pr of productMinPrices) {
        if (pr < 25) buckets.under25++;
        else if (pr < 50) buckets['25to50']++;
        else if (pr < 100) buckets['50to100']++;
        else if (pr < 200) buckets['100to200']++;
        else buckets.over200++;
    }

    const byType = (t) => changes.filter((c) => c.changeType === t);
    const inc = byType('price_increased');
    const dec = byType('price_decreased');
    const drops = dec.map((c) => ({ title: c.title, variant: c.variant, from: c.from, to: c.to, percent: c.percent, url: c.url }))
        .sort((a, b) => b.percent - a.percent);
    const hikes = inc.map((c) => ({ title: c.title, variant: c.variant, from: c.from, to: c.to, percent: c.percent, url: c.url }))
        .sort((a, b) => b.percent - a.percent);

    const avg = (arr) => (arr.length ? Number((arr.reduce((s, x) => s + x.percent, 0) / arr.length).toFixed(1)) : null);
    const inStock = products.filter((p) => p.available).length;
    const oosProducts = products.filter((p) => !p.available);

    // ---- Auto-generated executive takeaways (English) ----
    const takeaways = [];
    const totalVar = products.reduce((s, p) => s + p.variants.length, 0);
    takeaways.push(`${products.length} products (${totalVar} variants) currently listed; median price $${median(allPrices)?.toFixed(2) ?? 'n/a'}, range $${allPrices.length ? Math.min(...allPrices).toFixed(2) : 'n/a'}–$${allPrices.length ? Math.max(...allPrices).toFixed(2) : 'n/a'}.`);
    if (baselineTime) {
        takeaways.push(`Since ${baselineTime}: ${byType('new_product').length} new, ${byType('removed_product').length} removed, ${inc.length} price increases, ${dec.length} cuts.`);
        if (drops.length) takeaways.push(`Pricing moved DOWN on ${dec.length} variant(s), avg -${avg(dec)}%, deepest: ${drops[0].title} -${drops[0].percent}% to $${drops[0].to}.`);
        if (hikes.length) takeaways.push(`Pricing moved UP on ${inc.length} variant(s), avg +${avg(inc)}%, largest: ${hikes[0].title} +${hikes[0].percent}% to $${hikes[0].to}.`);
        if (byType('out_of_stock').length) takeaways.push(`${byType('out_of_stock').length} variant(s) went out of stock — possible demand spike or supply gap.`);
        if (byType('back_in_stock').length) takeaways.push(`${byType('back_in_stock').length} variant(s) restocked.`);
    } else {
        takeaways.push('No prior baseline yet — this is the first observation, so trend signals start from the next report.');
    }
    if (oosProducts.length > products.length * 0.2) takeaways.push(`${oosProducts.length} products fully out of stock (${((oosProducts.length / products.length) * 100).toFixed(0)}%) — unusually high, watch for clearance or discontinuation.`);

    return {
        report: 'shopify_competitor_intelligence',
        store,
        generatedAt: fetchedAt,
        comparedAgainst: baselineTime || null,
        catalog: {
            productCount: products.length,
            variantCount: totalVar,
            inStockProducts: inStock,
            outOfStockProducts: oosProducts.length,
            price: {
                min: allPrices.length ? Math.min(...allPrices) : null,
                median: median(allPrices),
                max: allPrices.length ? Math.max(...allPrices) : null,
            },
            priceBandProducts: buckets,
        },
        changeSummary: {
            newProducts: byType('new_product').length,
            removedProducts: byType('removed_product').length,
            priceIncreases: inc.length,
            priceDecreases: dec.length,
            outOfStock: byType('out_of_stock').length,
            backInStock: byType('back_in_stock').length,
            avgIncreasePct: avg(hikes),
            avgDecreasePct: avg(drops),
        },
        topDiscounts: drops.slice(0, 10),
        topIncreases: hikes.slice(0, 10),
        newProducts: byType('new_product').slice(0, 20),
        removedProducts: byType('removed_product').slice(0, 20),
        executiveTakeaways: takeaways,
        allChanges: changes,
    };
}

// ---- Landscape: compare several competitors in one strategic answer ------
function buildLandscapeReport(stores, perStore, anchor, generatedAt) {
    // perStore: {store, products, median, min, max, inStock, outOfStock, changes}
    const rows = perStore.map((s) => ({
        store: s.store,
        productCount: s.products.length,
        medianPrice: s.median,
        minPrice: s.min,
        maxPrice: s.max,
        inStock: s.inStock,
        outOfStock: s.outOfStock,
        outOfStockPct: s.products.length ? Number(((s.outOfStock / s.products.length) * 100).toFixed(1)) : null,
        recentChanges: s.changeCount,
    })).sort((a, b) => (b.medianPrice ?? -1) - (a.medianPrice ?? -1));

    const medians = perStore.map((s) => s.median).filter((x) => x !== null);
    const marketMedian = median(medians);

    // Position the anchor store against the market.
    const anchorRow = rows.find((r) => r.store === anchor) || null;
    let position = null;
    const takeaways = [];
    if (anchorRow && anchorRow.medianPrice !== null) {
        const cheaper = rows.filter((r) => r.medianPrice !== null && r.medianPrice < anchorRow.medianPrice).length;
        const pricier = rows.filter((r) => r.medianPrice !== null && r.medianPrice > anchorRow.medianPrice).length;
        position = { anchor, medianPrice: anchorRow.medianPrice, cheaperCompetitors: cheaper, pricierCompetitors: pricier };
        const deltaPct = marketMedian ? Number((((anchorRow.medianPrice - marketMedian) / (marketMedian || 1)) * 100).toFixed(1)) : null;
        if (deltaPct !== null) {
            takeaways.push(`${anchor} median is $${anchorRow.medianPrice.toFixed(2)}, ${Math.abs(deltaPct)}% ${deltaPct >= 0 ? 'above' : 'below'} the peer median of $${marketMedian.toFixed(2)}.`);
        }
    }
    takeaways.push(`Across ${stores.length} stores the median price is $${marketMedian !== null ? marketMedian.toFixed(2) : 'n/a'}; the spread runs $${Math.min(...perStore.map((s) => s.min).filter((x) => x !== null)).toFixed(0)}–$${Math.max(...perStore.map((s) => s.max).filter((x) => x !== null)).toFixed(0)}.`);

    const cheapest = rows.filter((r) => r.medianPrice !== null).slice(-1)[0];
    const premium = rows[0];
    if (cheapest) takeaways.push(`Lowest-positioned: ${cheapest.store} (median $${cheapest.medianPrice.toFixed(2)}).`);
    if (premium) takeaways.push(`Premium-positioned: ${premium.store} (median $${premium.medianPrice.toFixed(2)}).`);
    const highOos = rows.filter((r) => r.outOfStockPct !== null && r.outOfStockPct > 25);
    if (highOos.length) takeaways.push(`${highOos.map((r) => r.store).join(', ')} show >25% out-of-stock — possible clearance or supply stress.`);
    const movers = perStore.filter((s) => s.changeCount > 0).sort((a, b) => b.changeCount - a.changeCount);
    if (movers.length) takeaways.push(`Most active on pricing/stock lately: ${movers.slice(0, 3).map((s) => `${s.store} (${s.changeCount})`).join(', ')}.`);

    return {
        report: 'shopify_competitive_landscape',
        generatedAt,
        anchor,
        storesCompared: stores.length,
        market: { medianPrice: marketMedian },
        anchorPosition: position,
        competitors: rows,
        executiveTakeaways: takeaways,
    };
}

const medianPriceSafe = (x) => (x === 0 ? 1 : x);

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

// ---- Embeddable widget (CORS-open compact data) ---------------------------
function cors(response) {
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'content-type');
    return response;
}

async function handleWidgetData(url, request, env) {
    const store = safeNorm(url.searchParams.get('store'));
    if (!store) return cors(json({ error: 'invalid_store' }, 400));
    try {
        const products = await fetchProducts(store, FREE_MAX_PRODUCTS);
        const prices = products.flatMap((p) => p.variants.map((v) => v.price).filter((x) => x > 0));
        const inStock = products.filter((p) => p.variants.some((v) => v.available)).length;
        const payload = {
            store,
            productCount: products.length,
            inStock,
            outOfStock: products.length - inStock,
            minPrice: prices.length ? Math.min(...prices) : null,
            maxPrice: prices.length ? Math.max(...prices) : null,
            updatedAt: new Date().toISOString(),
        };
        const res = cors(json(payload));
        res.headers.set('Cache-Control', 'public, max-age=300');
        if (env.INTEL_KV) env.INTEL_KV.put(`snapshot-${store}`, JSON.stringify({ savedAt: new Date().toISOString(), products })).catch(() => {});
        return res;
    } catch (e) {
        return cors(json({ error: 'fetch_failed', store }, 502));
    }
}

// ---- Route handlers -------------------------------------------------------
async function handleSnapshot(url, request, env) {
    const rl = await rateLimit(env, `snap:${clientIp(request)}`, 30, 60);
    if (rl.limited) return json({ error: 'rate_limited', retry: 'in a minute' }, 429);

    const store = safeNorm(url.searchParams.get('store'));
    if (!store) return json({ error: 'Missing or invalid ?store= domain' }, 400);

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
    const store = safeNorm(url.searchParams.get('store'));
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

// High-value paid tier: distilled competitor intelligence report.
async function handleIntel(url, request, env) {
    const store = safeNorm(url.searchParams.get('store'));
    if (!store) return json({ error: 'Missing ?store= domain' }, 400);

    const requirements = buildRequirements(url.href, PRICE_INTEL_USD, `Competitor intelligence report for ${store}`);
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
        products = await fetchProducts(store, FULL_CAP);
    } catch (err) {
        return json({ error: err.message }, 502);
    }

    const kv = env.INTEL_KV;
    const key = `snapshot-${store}`;
    const raw = kv ? await kv.get(key, 'json') : null;
    let changes = [];
    let baselineTime = null;
    if (raw && Array.isArray(raw.products)) {
        changes = diffProducts(raw.products, products);
        baselineTime = raw.savedAt || null;
    }
    const fetchedAt = new Date().toISOString();
    if (kv) await kv.put(key, JSON.stringify({ savedAt: fetchedAt, products }));

    const report = buildIntelReport(store, products, changes, raw, baselineTime, fetchedAt);
    report.settlement = { payer: settlement.payer, transaction: settlement.transaction };
    return json(report);
}

// Batch competitor watch: many stores in one call, priced per store.
async function handleBatch(url, request, env) {
    if (request.method !== 'POST') return json({ error: 'batch endpoint expects POST with JSON {stores:[...]}' }, 405);

    let parsed;
    try {
        parsed = await request.json();
    } catch {
        return json({ error: 'invalid JSON body; expected {stores:[...]}' }, 400);
    }
    const stores = [...new Set((parsed.stores || []).map(safeNorm).filter(Boolean))];
    if (!stores.length) return json({ error: 'No stores provided' }, 400);
    if (stores.length > 50) return json({ error: 'Up to 50 stores per batch call' }, 400);

    const price = Number((stores.length * PRICE_PER_STORE_USD).toFixed(2));
    const requirements = buildRequirements(url.href, price, `Batch change watch for ${stores.length} Shopify stores`);
    const paymentHeader = request.headers.get('PAYMENT') || request.headers.get('X-PAYMENT');
    if (!paymentHeader) return paymentRequired(requirements);

    let settlement;
    try {
        settlement = await verifyAndSettle(paymentHeader, requirements);
    } catch (err) {
        return json({ error: 'unexpected_verify_error', detail: String(err?.message || err) }, 502);
    }
    if (!settlement.ok) return json({ x402Version: 1, error: settlement.reason }, 402);

    const kv = env.INTEL_KV;
    const results = await Promise.all(stores.map(async (store) => {
        try {
            const products = await fetchProducts(store, FREE_MAX_PRODUCTS);
            const key = `snapshot-${store}`;
            const raw = kv ? await kv.get(key, 'json') : null;
            let changes = [];
            if (raw && Array.isArray(raw.products)) changes = diffProducts(raw.products, products);
            if (kv) await kv.put(key, JSON.stringify({ savedAt: new Date().toISOString(), products }));
            const c = {};
            for (const ch of changes) c[ch.changeType] = (c[ch.changeType] || 0) + 1;
            return { store, ok: true, productCount: products.length, changeCount: changes.length, byType: c };
        } catch (err) {
            return { store, ok: false, error: err.message };
        }
    }));

    return json({
        storeCount: stores.length,
        priceUsd: price,
        generatedAt: new Date().toISOString(),
        results,
        settlement: { payer: settlement.payer, transaction: settlement.transaction },
    });
}

// ---- Usage analytics (internal, day-bucket counters in KV) ----------------
function classifyClient(request) {
    const ua = (request.headers.get('user-agent') || '').toLowerCase();
    if (/mcp|x402|anthropic|openai|claude|cursor|agent|llm|gpt|gemini|copilot|bot/.test(ua)) return 'agent';
    return 'browser';
}

async function recordHit(request, response, env) {
    try {
        const u = new URL(request.url);
        const day = new Date().toISOString().slice(0, 10);
        const path = u.pathname;
        if (path === '/health' || path.startsWith('/.well-known')) return;
        const kind = classifyClient(request);
        const status402 = response.status === 402;
        const paid = request.headers.get('PAYMENT') ? 1 : 0;
        const key = `stats-${day}`;
        const raw = await env.INTEL_KV.get(key);
        const s = raw ? JSON.parse(raw) : { total: 0, agent: 0, browser: 0, payments402: 0, paidTries: 0, paths: {}, clients: {} };
        s.total += 1;
        s[kind] += 1;
        if (status402) s.payments402 += 1;
        if (paid) s.paidTries += 1;
        const pk = `${path}|${kind}${status402 ? '|402' : ''}`;
        s.paths[pk] = (s.paths[pk] || 0) + 1;
        const ua = request.headers.get('user-agent') || 'unknown';
        const ck = `${kind}:${ua.slice(0, 60)}`;
        s.clients[ck] = (s.clients[ck] || 0) + 1;
        await env.INTEL_KV.put(key, JSON.stringify(s));
    } catch (e) {
        // Analytics must never break a request.
    }
}

async function handleStats(url, request, env) {
    const keyParam = url.searchParams.get('key');
    const auth = request.headers.get('x-admin-key') || keyParam;
    if (auth !== ADMIN_KEY) return json({ error: 'forbidden' }, 403);
    const n = Math.min(Number(url.searchParams.get('days')) || 7, 30);
    const days = [];
    for (let i = 0; i < n; i++) {
        const d = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10);
        const raw = await env.INTEL_KV.get(`stats-${d}`);
        if (raw) days.push({ day: d, ...JSON.parse(raw) });
    }
    return json({ days });
}

async function handleLandscape(url, request, env) {
    let parsed = {};
    if (request.method === 'POST') {
        try { parsed = await request.json(); } catch { parsed = {}; }
    }
    const anchor = safeNorm(parsed.anchor || url.searchParams.get('anchor'));
    let rawStores = parsed.stores;
    if (!Array.isArray(rawStores)) {
        const q = url.searchParams.get('stores') || '';
        rawStores = q ? q.split(',') : [];
    }
    const stores = [...new Set(rawStores.map(safeNorm))].filter(Boolean);
    if (!stores.length) return json({ error: 'missing_stores', hint: 'provide stores[] (max ' + LANDSCAPE_MAX_STORES + ')' }, 400);
    if (stores.length > LANDSCAPE_MAX_STORES) return json({ error: 'too_many_stores', max: LANDSCAPE_MAX_STORES }, 400);
    const useAnchor = anchor && stores.includes(anchor) ? anchor : stores[0];

    if (request.headers.get('PAYMENT')) {
        const requirements = buildRequirements(url.href, PRICE_LANDSCAPE_USD, `Competitive landscape across ${stores.length} Shopify stores`);
        const settle = await verifyAndSettle(request.headers.get('PAYMENT'), requirements);
        if (!settle.valid) return json({ error: 'payment_invalid', reason: settle.reason }, 402);
    } else {
        const requirements = buildRequirements(url.href, PRICE_LANDSCAPE_USD, `Competitive landscape across ${stores.length} Shopify stores`);
        return paymentRequired(requirements);
    }

    const perStore = await Promise.all(stores.map(async (store) => {
        try {
            const products = await fetchProducts(store, 0);
            const prices = products.flatMap((p) => p.variants.map((v) => v.price).filter((x) => x > 0));
            const prev = await env.INTEL_KV.get(`snapshot-${store}`);
            let changes = [];
            if (prev) {
                const prevObj = JSON.parse(prev);
                changes = diffProducts(prevObj.products, products);
            }
            await env.INTEL_KV.put(`snapshot-${store}`, JSON.stringify({ savedAt: new Date().toISOString(), store, products }));
            return {
                store, products,
                median: median(prices), min: prices.length ? Math.min(...prices) : null, max: prices.length ? Math.max(...prices) : null,
                inStock: products.filter((p) => p.variants.some((v) => v.available)).length,
                outOfStock: products.filter((p) => p.variants.every((v) => !v.available)).length,
                changeCount: changes.length,
            };
        } catch (e) {
            return { store, products: [], median: null, min: null, max: null, inStock: 0, outOfStock: 0, changeCount: 0, error: e.message };
        }
    }));

    const report = buildLandscapeReport(stores, perStore, useAnchor, new Date().toISOString());
    report.paid = true;
    report.priceUsd = PRICE_LANDSCAPE_USD;
    return json(report);
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
                {
                    name: 'shopify_intel_report',
                    description: 'PAID ($0.50 USDC on Base via x402). The highest-value tool: a full-catalog competitor intelligence report with price bands, median/range, biggest discounts & hikes, stock signals and auto-generated executive takeaways you can put straight into a briefing.',
                    inputSchema: {
                        type: 'object',
                        properties: { store: { type: 'string', description: 'Shopify domain, e.g. allbirds.com' } },
                        required: ['store'],
                    },
                },
                {
                    name: 'shopify_batch_watch',
                    description: `PAID ($0.03 USDC per store on Base via x402, max ${BATCH_MAX_STORES}). Monitor a whole set of competitor Shopify stores in one call; per-store change counts (new/removed/price/stock). Use for tracking many rivals, category-wide price monitoring, brand/agency portfolio surveillance, market-scanning at scale.`,
                    inputSchema: {
                        type: 'object',
                        properties: { stores: { type: 'array', items: { type: 'string' }, description: 'Shopify domains, e.g. ["allbirds.com","gymshark.com"]' } },
                        required: ['stores'],
                    },
                },
                {
                    name: 'shopify_landscape',
                    description: `PAID ($${PRICE_LANDSCAPE_USD} USDC on Base via x402, up to ${LANDSCAPE_MAX_STORES} stores). Strategic competitive landscape: positions an anchor store against competitors by median price, flags premium/value players, price-war signals and stock anomalies.`,
                    inputSchema: {
                        type: 'object',
                        properties: {
                            stores: { type: 'array', items: { type: 'string' }, description: 'Competitor Shopify domains, up to 10' },
                            anchor: { type: 'string', description: 'Your store domain to position against peers' },
                        },
                        required: ['stores'],
                    },
                },
            ],
        });
    }

    if (method === 'tools/call') {
        const name = params?.name;

        if (name === 'shopify_batch_watch') {
            const rawStores = params?.arguments?.stores;
            const stores = [...new Set((Array.isArray(rawStores) ? rawStores : []).map(safeNorm).filter(Boolean))];
            if (!stores.length) return rerr(-32602, 'Missing required argument: stores (non-empty array)');
            if (stores.length > BATCH_MAX_STORES) return rerr(-32602, `Up to ${BATCH_MAX_STORES} stores per call`);
            const price = Number((stores.length * PRICE_PER_STORE_USD).toFixed(2));
            const reqHeaders = { 'content-type': 'application/json' };
            const payH = request.headers.get('PAYMENT') || request.headers.get('X-PAYMENT');
            if (payH) reqHeaders.PAYMENT = payH;
            const sub = new Request(new URL(request.url).href, {
                method: 'POST',
                headers: reqHeaders,
                body: JSON.stringify({ stores }),
            });
            const res = await handleBatch(new URL(request.url), sub, env);
            const txt = await res.text();
            const outHeaders = {};
            const pr = res.headers.get('PAYMENT-REQUIRED');
            if (pr) outHeaders['PAYMENT-REQUIRED'] = pr;
            if (res.status === 402 && !payH) {
                return toolText(`This tool costs $${price} USDC on Base via x402 (${stores.length} stores × $${PRICE_PER_STORE_USD}). Pay to ${PAY_TO} and retry carrying the PAYMENT header.`, true, outHeaders);
            }
            return toolText(txt, res.status >= 400, outHeaders);
        }

        if (name === 'shopify_landscape') {
            const rawStores = params?.arguments?.stores;
            const stores = [...new Set((Array.isArray(rawStores) ? rawStores : []).map(safeNorm).filter(Boolean))];
            if (!stores.length) return rerr(-32602, 'Missing required argument: stores (non-empty array)');
            if (stores.length > LANDSCAPE_MAX_STORES) return rerr(-32602, `Up to ${LANDSCAPE_MAX_STORES} stores per call`);
            const anchor = safeNorm(params?.arguments?.anchor) || stores[0];
            const reqHeaders = { 'content-type': 'application/json' };
            const payH = request.headers.get('PAYMENT') || request.headers.get('X-PAYMENT');
            if (payH) reqHeaders.PAYMENT = payH;
            const sub = new Request(new URL(request.url).href, {
                method: 'POST',
                headers: reqHeaders,
                body: JSON.stringify({ stores, anchor }),
            });
            const res = await handleLandscape(new URL(request.url), sub, env);
            const txt = await res.text();
            const outHeaders = {};
            const pr = res.headers.get('PAYMENT-REQUIRED');
            if (pr) outHeaders['PAYMENT-REQUIRED'] = pr;
            if (res.status === 402 && !payH) {
                return toolText(`This tool costs $${PRICE_LANDSCAPE_USD} USDC on Base via x402 and compares up to ${LANDSCAPE_MAX_STORES} stores. Pay to ${PAY_TO} and retry with the PAYMENT header.`, true, outHeaders);
            }
            return toolText(txt, res.status >= 400, outHeaders);
        }

        const store = safeNorm(params?.arguments?.store);
        if (!store) return rerr(-32602,'Missing required argument: store');

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

        if (name === 'shopify_intel_report') {
            const requirements = buildRequirements(new URL(request.url).href, PRICE_INTEL_USD, `Competitor intelligence report for ${store}`);
            const paymentHeader = request.headers.get('PAYMENT') || request.headers.get('X-PAYMENT');
            if (!paymentHeader) {
                return toolText(
                    `This tool costs $${PRICE_INTEL_USD} USDC on Base via the x402 protocol. Pay to ${PAY_TO} and retry carrying the x402 payment in the PAYMENT header. See the PAYMENT-REQUIRED response header for the machine-readable challenge.`,
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
                const products = await fetchProducts(store, FULL_CAP);
                const kv = env.INTEL_KV;
                const key = `snapshot-${store}`;
                const raw = kv ? await kv.get(key, 'json') : null;
                let changes = [];
                let baselineTime = null;
                if (raw && Array.isArray(raw.products)) {
                    changes = diffProducts(raw.products, products);
                    baselineTime = raw.savedAt || null;
                }
                const fetchedAt = new Date().toISOString();
                if (kv) await kv.put(key, JSON.stringify({ savedAt: fetchedAt, products }));
                const report = buildIntelReport(store, products, changes, raw, baselineTime, fetchedAt);
                report.settlement = { payer: settlement.payer, transaction: settlement.transaction };
                return toolText(JSON.stringify(report, null, 2));
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

const LEGAL_CSS = `
:root{--bg:#0b0e14;--card:#141925;--line:#222a3a;--fg:#e8ecf4;--mut:#8b95a7;--acc:#5b8cff}
*{box-sizing:border-box}
body{margin:0;font:15px/1.6 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:var(--bg);color:var(--fg)}
.wrap{max-width:820px;margin:0 auto;padding:48px 22px}
h1{font-size:28px;margin:0 0 4px}
h2{font-size:18px;margin:28px 0 6px}
p,li{color:#c6cdda}
.muted{color:var(--mut);font-size:13.5px}
a{color:var(--acc)}
hr{border:0;border-top:1px solid var(--line);margin:30px 0}`;

function legalPage(title, bodyHtml) {
    return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} · Shopify Change Intelligence</title><style>${LEGAL_CSS}</style></head>
<body><div class="wrap">
<h1>${title}</h1>
<p class="muted">Last updated: 2026-09-30 · <a href="/">Home</a> · <a href="/terms">Terms</a> · <a href="/privacy">Privacy</a> · <a href="/contact">Contact</a></p>
${bodyHtml}
<hr><p class="muted">Shopify Change Intelligence — public-store data monitoring for AI agents. <a href="/">Back to home</a></p>
</div></body></html>`;
}

function renderPrivacy() {
    return legalPage('Privacy Policy', `
<h2>What we collect</h2>
<ul>
<li><b>Queries you send:</b> the public store domain you request and the resulting catalog metadata (product titles, prices, availability) fetched from that public storefront.</li>
<li><b>Technical logs:</b> request timestamps, client type, and HTTP status codes, used for rate limiting, abuse prevention and service reliability.</li>
<li><b>Payments:</b> settled peer-to-peer in USDC on Base through the x402 protocol. We do <b>not</b> collect, see or store cards, bank details, passwords or personal billing information. On-chain transactions are recorded on the public Base ledger.</li>
</ul>
<h2>What we do not do</h2>
<ul>
<li>We do not sell personal data, run advertising trackers, or require accounts for API use.</li>
<li>We only read data that stores already expose publicly to any visitor.</li>
</ul>
<h2>How data is used &amp; retained</h2>
<p>Data is used solely to provide and improve the service, prevent abuse, and compute change history. Historical snapshots are retained as needed to deliver change detection and may be deleted on request.</p>
<h2>Your rights &amp; contact</h2>
<p>To request access, correction or deletion of data associated with your requests, contact <a href="mailto:contentforge.press@outlook.com">contentforge.press@outlook.com</a>. See also our <a href="/contact">contact page</a>.</p>`);
}

function renderTerms() {
    return legalPage('Terms of Service', `
<h2>The service</h2>
<p>Shopify Change Intelligence provides monitoring of data published on <b>public Shopify storefronts</b>, exposed over HTTP and MCP. Use is offered on a pay-per-result basis for paid tiers; free tiers are provided as-is.</p>
<h2>Acceptable use</h2>
<ul>
<li>You agree to use the service lawfully and not to attempt unauthorized access, disruption, circumvention of rate limits/payments, or extraction of non-public data.</li>
<li>Requests are validated to block access to internal or private network resources.</li>
</ul>
<h2>No warranty</h2>
<p>All data is sourced from third-party public stores and is provided "as is", without warranties of accuracy, completeness or fitness for a particular purpose. You are responsible for decisions made using the data.</p>
<h2>Limitation of liability</h2>
<p>To the maximum extent permitted by law, the service shall not be liable for any indirect, incidental or consequential damages arising from use or inability to use the service.</p>
<h2>Payments</h2>
<p>Paid requests are settled in USDC on Base via x402 and are generally non-refundable once the result has been delivered. If a result fails to deliver despite settlement, contact us for resolution.</p>
<h2>Changes</h2>
<p>We may update these terms; continued use after changes constitutes acceptance. Questions: <a href="mailto:contentforge.press@outlook.com">contentforge.press@outlook.com</a>.</p>`);
}

function renderContact() {
    return legalPage('Contact &amp; Abuse', `
<h2>Get in touch</h2>
<p>General, security or abuse reports: <a href="mailto:contentforge.press@outlook.com">contentforge.press@outlook.com</a></p>
<p>Please include the store domain, endpoint and a description of the issue. We aim to respond to legitimate reports.</p>
<h2>Reporting abuse</h2>
<p>If you believe the service is being used to infringe rights or process data improperly, email us with details and we will investigate promptly.</p>`);
}

// ---- Subscription plans ---------------------------------------------------
const PLANS = {
    pro: {
        id: 'pro', name: 'Pro', price: 99, days: 30, tagline: 'For brands & sellers that watch competitors closely',
        features: [
            'Track up to 25 competitor stores',
            'Change alerts (price, stock, new/removed products)',
            'Weekly competitor digest dashboard',
            'All paid MCP tools included (changes / intel / batch)',
            'Email + webhook notifications',
        ],
    },
    business: {
        id: 'business', name: 'Business', price: 499, days: 30, tagline: 'For agencies & multi-brand teams',
        features: [
            'Track up to 150 competitor stores',
            'Up to 10 team seats',
            'Higher API & batch limits',
            'Strategic landscape reports included',
            'Priority support',
        ],
    },
    enterprise: {
        id: 'enterprise', name: 'Enterprise', price: 2000, days: 30, tagline: 'For large brands & investors',
        features: [
            'Unlimited tracked stores & seats',
            'Custom verticals & private data feeds',
            'Dedicated strategic landscape reports',
            'SLA & personal onboarding',
            'SSO & advanced access controls',
        ],
    },
};

function renderPricing() {
    const cards = Object.values(PLANS).map((p, i) => `
  <div class="plan${i === 1 ? ' hl' : ''}">
    ${i === 1 ? '<div class="pop">Most popular</div>' : ''}
    <div class="pname">${p.name}</div>
    <div class="price"><span class="amt">$${p.price}</span><span class="per">/month</span></div>
    <div class="tag">${p.tagline}</div>
    <ul>${p.features.map(f => `<li>${f}</li>`).join('')}</ul>
    <button class="cta" data-plan="${p.id}">Choose ${p.name}</button>
  </div>`).join('');

    return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Pricing · Shopify Change Intelligence</title>
<style>
:root{--bg:#0b0e14;--card:#141925;--line:#222a3a;--fg:#e8ecf4;--mut:#8b95a7;--acc:#5b8cff}
*{box-sizing:border-box}
body{margin:0;font:15px/1.6 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:var(--bg);color:var(--fg)}
.wrap{max-width:1080px;margin:0 auto;padding:48px 20px}
h1{font-size:30px;margin:0 0 6px;text-align:center}
.sub{color:var(--mut);text-align:center;margin-bottom:34px}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;align-items:stretch}
.plan{position:relative;background:var(--card);border:1px solid var(--line);border-radius:16px;padding:26px 22px;display:flex;flex-direction:column}
.plan.hl{border-color:var(--acc);box-shadow:0 0 0 1px var(--acc),0 18px 50px -20px rgba(91,140,255,.5)}
.pop{position:absolute;top:-11px;left:50%;transform:translateX(-50%);background:var(--acc);color:#fff;font-size:11px;font-weight:600;letter-spacing:.04em;padding:4px 12px;border-radius:999px;text-transform:uppercase}
.pname{font-size:14px;color:var(--mut);text-transform:uppercase;letter-spacing:.06em}
.price{margin:8px 0 2px}.amt{font-size:40px;font-weight:700}.per{color:var(--mut);font-size:14px}
.tag{color:#aab4c6;font-size:13.5px;min-height:40px;margin-bottom:14px}
ul{list-style:none;padding:0;margin:0 0 20px;flex:1}
li{padding:8px 0 8px 26px;position:relative;color:#c6cdda;font-size:14px;border-bottom:1px solid rgba(255,255,255,.04)}
li:before{content:"✓";position:absolute;left:0;color:var(--acc);font-weight:700}
.cta{margin-top:auto;width:100%;padding:12px;border-radius:10px;border:1px solid var(--acc);background:transparent;color:#cdd9ff;font-size:15px;font-weight:600;cursor:pointer}
.plan.hl .cta{background:var(--acc);color:#fff}
.foot{margin-top:30px;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:20px;display:none}
.foot.show{display:block}
.foot h3{margin:0 0 8px;font-size:15px}
pre{background:#0d1119;border:1px solid var(--line);border-radius:10px;padding:12px;overflow:auto;font-size:12.5px;color:#cdd6e6;white-space:pre-wrap;word-break:break-all}
.note{color:var(--mut);font-size:13px;margin-top:26px;text-align:center}
a{color:#9db8ff}
@media(max-width:860px){.grid{grid-template-columns:1fr}}
</style></head>
<body><div class="wrap">
<h1>Plans &amp; pricing</h1>
<div class="sub">Start free with pay-per-result, or get continuous monitoring. Billed in <b>USDC on Base</b> — no card, no processor.</div>
<div class="grid">${cards}</div>
<div class="foot" id="paybox">
  <h3 id="paytitle">Complete your subscription</h3>
  <p class="note" style="text-align:left;margin:0 0 10px">Pay from any x402-compatible wallet/agent, or simply ask your AI assistant to run the payment request below. After payment your access key appears here instantly.</p>
  <pre id="payjson">Loading…</pre>
</div>
<p class="note">Need only a few calls? <a href="/">Pay per result</a> instead · <a href="/terms">Terms</a> · <a href="/privacy">Privacy</a> · <a href="/contact">Contact</a></p>
</div>
<script>
let payTimer=null;
document.querySelectorAll('.cta').forEach(b=>b.addEventListener('click',async()=>{
  const box=document.getElementById('paybox'); box.classList.add('show');
  document.getElementById('paytitle').textContent='Setting up '+b.dataset.plan+'…';
  document.getElementById('payjson').textContent='Loading…';
  clearInterval(payTimer);
  try{
    const r=await fetch('/v1/order?plan='+b.dataset.plan);
    const o=await r.json();
    if(o.error){document.getElementById('payjson').textContent=o.error;return;}
    document.getElementById('paytitle').textContent='Send exactly '+o.amountUsd+' USDC on Base';
    document.getElementById('payjson').textContent='To: '+o.payTo+'\\nNetwork: Base (ERC-20)\\nExact amount: '+o.amountUsd+' USDC\\n\\nSend from any exchange/wallet. Order expires in 60 min. Waiting for confirmation…';
    payTimer=setInterval(async()=>{
      const c=await (await fetch('/v1/order/check?id='+o.orderId)).json();
      if(c.status==='paid'){
        clearInterval(payTimer);
        document.getElementById('paytitle').textContent='✓ Payment confirmed';
        document.getElementById('payjson').textContent='Access key: '+c.accessKey+'\\nPlan: '+c.plan+'\\nSave this key and use it at your dashboard.';
      }else if(c.status==='expired'){clearInterval(payTimer);document.getElementById('payjson').textContent='Order expired. Please start again.';}
    },6000);
  }catch(e){document.getElementById('payjson').textContent='Error: '+e;}
}));
</script>
</body></html>`;
}

function newAccessKey() {
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    return 'sci_' + Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

// ---- Human direct-pay（真人直接链上付USDC，唯一金额识别，Base RPC核验）----
async function findDirectPayment(expectUnits, windowBlocks = 1900) {
    const body = { jsonrpc: '2.0', id: 1, method: 'eth_blockNumber', params: [] };
    const hb = await (await fetch('https://mainnet.base.org', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })).json();
    const head = parseInt(hb.result, 16);
    const fromBlock = '0x' + Math.max(0, head - windowBlocks).toString(16);
    const padded = PAY_TO.slice(2).toLowerCase().padStart(64, '0');
    const req = { jsonrpc: '2.0', id: 2, method: 'eth_getLogs', params: [{ address: USDC_BASE, fromBlock, toBlock: 'latest', topics: ['0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef', null, '0x' + padded] }] };
    const lr = await (await fetch('https://mainnet.base.org', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(req) })).json();
    if (!Array.isArray(lr.result)) return null;
    for (const log of lr.result) if (log.data && BigInt(log.data) === BigInt(expectUnits)) {
        return { tx: log.transactionHash, from: '0x' + (log.topics[1] || '').slice(26) };
    }
    return null;
}

async function createDirectOrder(plan, kv) {
    const salt = crypto.getRandomValues(new Uint8Array(2));
    const extra = ((salt[0] << 8 | salt[1]) % 900 + 100);
    const amountUsd = +(plan.price + extra / 1_000_000).toFixed(6);
    const bytes = new Uint8Array(16); crypto.getRandomValues(bytes);
    const orderId = 'ord_' + Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
    const order = { orderId, plan: plan.id, planName: plan.name, amountUsd, amountUnits: String(Math.round(amountUsd * 1e6)), payTo: PAY_TO, network: 'base', asset: USDC_BASE, status: 'awaiting', createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 60 * 60e3).toISOString() };
    if (kv) await kv.put(`order-${orderId}`, JSON.stringify(order), { expirationTtl: 5400 });
    return order;
}

async function checkDirectOrder(order, kv) {
    if (order.status === 'paid') return order;
    if (new Date(order.expiresAt).getTime() < Date.now()) { order.status = 'expired'; return order; }
    const found = await findDirectPayment(order.amountUnits);
    if (!found) return order;
    order.status = 'paid'; order.tx = found.tx; order.payer = found.from; order.paidAt = new Date().toISOString();
    const plan = PLANS[order.plan];
    const expiresAt = new Date(Date.now() + plan.days * 86400e3).toISOString();
    const accessKey = newAccessKey();
    order.accessKey = accessKey;
    if (kv) await kv.put(`sub-${accessKey}`, JSON.stringify({ accessKey, plan: plan.id, payer: found.from || '', startedAt: new Date().toISOString(), expiresAt, priceUsd: plan.price, source: 'direct', orderId: order.orderId }));
    if (kv) await kv.put(`order-${order.orderId}`, JSON.stringify(order));
    return order;
}

async function handleSubscribe(url, request, env) {
    const planId = url.searchParams.get('plan');
    const plan = PLANS[planId];
    if (!plan) return json({ error: 'invalid_plan', plans: Object.keys(PLANS) }, 400);

    const resource = `${new URL(url).origin}/v1/subscribe?plan=${planId}`;
    const requirements = buildRequirements(resource, plan.price, `Shopify Change Intelligence ${plan.name} subscription (${plan.days} days)`);

    const paymentHeader = request.headers.get('PAYMENT') || request.headers.get('X-PAYMENT');
    if (!paymentHeader) return paymentRequired(requirements);

    let settlement;
    try {
        settlement = await verifyAndSettle(paymentHeader, requirements);
    } catch (err) {
        return json({ error: 'unexpected_verify_error', detail: String(err?.message || err) }, 502);
    }
    if (!settlement.ok) return json({ x402Version: 1, error: settlement.reason }, 402);

    const now = Date.now();
    const expiresAt = new Date(now + plan.days * 86400_000).toISOString();
    const accessKey = newAccessKey();
    const record = {
        accessKey,
        plan: plan.id,
        payer: settlement.payer,
        startedAt: new Date(now).toISOString(),
        expiresAt,
        transaction: settlement.transaction,
        priceUsd: plan.price,
    };

    const kv = env.INTEL_KV;
    if (kv) {
        await kv.put(`sub-${accessKey}`, JSON.stringify(record));
        await kv.put(`subpayer-${settlement.payer}`, accessKey);
    }

    return json({
        ok: true,
        accessKey,
        plan: plan.id,
        payer: settlement.payer,
        startedAt: record.startedAt,
        expiresAt,
        transaction: settlement.transaction,
    });
}

// ---- Dashboard & watchlist ------------------------------------------------
const PLAN_STORE_LIMITS = { pro: 25, business: 150, enterprise: 100000 };

async function loadSubscription(kv, accessKey) {
    if (!kv || !accessKey) return null;
    const raw = await kv.get(`sub-${accessKey}`);
    if (!raw) return null;
    const sub = JSON.parse(raw);
    sub.active = new Date(sub.expiresAt).getTime() > Date.now();
    return sub;
}

async function getWatchlist(kv, accessKey) {
    const raw = await kv.get(`watch-${accessKey}`);
    if (!raw) return { stores: [], webhookUrl: '', emailAlerts: '', updatedAt: null };
    return JSON.parse(raw);
}

function renderDashboard() {
    return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Dashboard · Shopify Change Intelligence</title>
<style>
:root{--bg:#0b0e14;--card:#141925;--line:#222a3a;--fg:#e8ecf4;--mut:#8b95a7;--acc:#5b8cff;--green:#3ecf8e;--red:#ff6b6b}
*{box-sizing:border-box}
body{margin:0;font:14.5px/1.6 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:var(--bg);color:var(--fg)}
.wrap{max-width:980px;margin:0 auto;padding:40px 20px}
h1{font-size:26px;margin:0 0 4px}
a{color:#9db8ff}
.sub{color:var(--mut);font-size:13.5px;margin-bottom:22px}
.login{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:22px;display:flex;gap:10px;flex-wrap:wrap}
.login input{flex:1;min-width:240px;background:#0d1119;border:1px solid var(--line);border-radius:9px;color:var(--fg);padding:11px 13px;font-size:14px}
button{padding:11px 18px;border-radius:9px;border:1px solid var(--acc);background:var(--acc);color:#fff;font-weight:600;cursor:pointer;font-size:14px}
button.ghost{background:transparent;color:#cdd9ff}
.app{display:none}.app.on{display:block}
.bar{display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between;margin-bottom:18px}
.badge{background:#0d1119;border:1px solid var(--line);border-radius:999px;padding:5px 13px;font-size:12.5px;color:#c6cdda}
.badge b{color:var(--green)}
.addrow{display:flex;gap:10px;flex-wrap:wrap;margin:14px 0 20px}
.addrow input{flex:1;min-width:200px;background:#0d1119;border:1px solid var(--line);border-radius:9px;color:var(--fg);padding:11px 13px}
.storelist{display:grid;gap:10px}
.store{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px 16px}
.store .top{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
.store .dom{font-weight:600}
.store .meta{color:var(--mut);font-size:12.5px}
.changes{margin-top:10px;display:none}.changes.on{display:block}
.chg{padding:6px 0 6px 22px;position:relative;font-size:13px;color:#c6cdda;border-top:1px solid rgba(255,255,255,.05)}
.chg:before{position:absolute;left:0;font-weight:700}
.chg.up:before{content:"▲";color:var(--red)} .chg.down:before{content:"▼";color:var(--green)}
.chg.new:before{content:"＋";color:var(--acc)} .chg.gone:before{content:"－";color:var(--mut)}
.chg.in:before{content:"↺";color:var(--green)} .chg.out:before{content:"⊘";color:var(--red)}
.pill{font-size:11px;padding:2px 9px;border-radius:999px;font-weight:600}
.pill.k0{background:rgba(62,207,142,.15);color:var(--green)}
.pill.k{background:rgba(255,107,107,.15);color:var(--red)}
.settings{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:16px;margin-top:22px}
.settings input{width:100%;background:#0d1119;border:1px solid var(--line);border-radius:9px;color:var(--fg);padding:10px 12px;margin-top:6px}
.muted{color:var(--mut);font-size:12.5px}
.err{color:var(--red);font-size:13.5px;margin-top:8px;min-height:18px}
</style></head>
<body><div class="wrap">
<h1>Competitor dashboard</h1>
<div class="sub">Track stores, get change alerts. <a href="/pricing">View plans</a> · <a href="/">Home</a></div>

<div id="loginview">
  <div class="login">
    <input id="key" placeholder="Paste your access key (starts with sci_)" autocomplete="off">
    <button onclick="connect()">Open dashboard</button>
  </div>
  <div class="err" id="loginerr"></div>
  <p class="sub" style="margin-top:16px">No key yet? <a href="/pricing">Get a subscription</a> — pay in USDC, receive your key instantly.</p>
</div>

<div class="app" id="appview">
  <div class="bar">
    <div>
      <span class="badge">Plan <b id="planname"></b></span>
      <span class="badge">Renews/expires <b id="exp"></b></span>
      <span class="badge"><b id="count"></b> stores</span>
    </div>
    <button onclick="refreshAll()" id="refreshbtn">Refresh all</button>
  </div>
  <div class="err" id="apperr"></div>
  <div class="addrow">
    <input id="newstore" placeholder="competitor-store.com" autocomplete="off">
    <button onclick="addStore()">Add store</button>
  </div>
  <div class="storelist" id="storelist"></div>
  <div class="settings">
    <b>Alert webhook</b>
    <p class="muted" style="margin:4px 0">We POST new changes here on every auto-refresh (Slack, Zapier, your app…).</p>
    <input id="webhook" placeholder="https://hooks.example.com/...">
    <b style="display:block;margin-top:14px">Email alerts</b>
    <p class="muted" style="margin:4px 0">Get an email digest when changes are detected automatically.</p>
    <input id="alertemail" placeholder="you@company.com">
    <div style="margin-top:10px"><button class="ghost" onclick="saveSettings()">Save settings</button></div>
  </div>
  <p style="margin-top:18px"><a href="#" onclick="logout();return false">Use another key</a></p>
</div>
</div>
<script>
let state=null;
const $=id=>document.getElementById(id);
function connect(){
  const key=$('key').value.trim(); $('loginerr').textContent='';
  if(!key){$('loginerr').textContent='Please enter your access key.';return;}
  fetch('/v1/watch?key='+encodeURIComponent(key)).then(r=>r.json()).then(d=>{
    if(d.error){$('loginerr').textContent=d.error;return;}
    state=d; $('loginview').style.display='none'; $('appview').classList.add('on');
    render();
  }).catch(e=>$('loginerr').textContent='Connection error: '+e);
}
function logout(){location.reload();}
function render(){
  $('planname').textContent=state.plan;
  $('exp').textContent=(state.active?'':'EXPIRED · ')+state.expiresAt.slice(0,10);
  $('count').textContent=state.stores.length;
  $('webhook').value=state.webhookUrl||'';
  $('alertemail').value=state.alertEmail||'';
  const list=$('storelist');
  if(!state.stores.length){list.innerHTML='<p class="muted">No stores yet. Add your first competitor above.</p>';return;}
  list.innerHTML=state.stores.map(s=>{
    const n=(s.lastChanges||[]).length;
    return '<div class="store"><div class="top"><div><div class="dom">'+s.store+
      '</div><div class="meta">'+(s.lastChecked?('checked '+new Date(s.lastChecked).toLocaleString()):'not checked yet')+'</div></div>'+
      '<div><span class="pill '+(n?'k':'k0')+'">'+n+' changes</span> '+
      '<button class="ghost" onclick="toggleChanges(this)">Show</button> '+
      '<button class="ghost" onclick="refreshOne(\\''+s.store+'\\')">Check now</button> '+
      '<button class="ghost" onclick="removeStore(\\''+s.store+'\\')">Remove</button></div></div>'+
      '<div class="changes">'+((s.lastChanges||[]).map(c=>changeHtml(c)).join('')||'<div class="muted">No changes since last snapshot.</div>')+'</div></div>';
  }).join('');
}
function changeHtml(c){
  const map={price_increased:['up','Price ↑'],price_decreased:['down','Price ↓'],new_product:['new','New'],removed_product:['gone','Removed'],back_in_stock:['in','Restocked'],out_of_stock:['out','Out of stock']};
  const m=map[c.changeType]||['new',c.changeType];
  let txt=c.title||'';
  if(c.from!=null) txt+=' — $'+c.from+' → $'+c.to+(c.percent?(' ('+c.percent+'%)'):'');
  return '<div class="chg '+m[0]+'"><b>'+m[1]+'</b> · '+txt+'</div>';
}
function toggleChanges(btn){const box=btn.closest('.store').querySelector('.changes');box.classList.toggle('on');btn.textContent=box.classList.contains('on')?'Hide':'Show';}
function callApi(extra){
  $('apperr').textContent='';
  return fetch('/v1/watch?key='+encodeURIComponent(state.accessKey)+(extra||''),{method:extra?'POST':'GET',
    body:extra?JSON.stringify({}):null,headers:{'content-type':'application/json'}})
  .then(async r=>{const d=await r.json();if(d.error)throw d.error;return d;});
}
function addStore(){
  const store=$('newstore').value.trim(); if(!store)return;
  fetch('/v1/watch/add?key='+encodeURIComponent(state.accessKey),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({store})})
  .then(r=>r.json()).then(d=>{if(d.error){$('apperr').textContent=d.error;return;}state=d;$('newstore').value='';render();})
  .catch(e=>$('apperr').textContent=e.message||String(e));
}
function removeStore(store){
  fetch('/v1/watch/remove?key='+encodeURIComponent(state.accessKey),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({store})})
  .then(r=>r.json()).then(d=>{if(d.error){$('apperr').textContent=d.error;return;}state=d;render();})
  .catch(e=>$('apperr').textContent=e.message||String(e));
}
function refreshOne(store){
  $('refreshbtn').textContent='Checking…';
  fetch('/v1/watch/refresh?key='+encodeURIComponent(state.accessKey)+'&store='+encodeURIComponent(store))
  .then(r=>r.json()).then(d=>{if(d.error){$('apperr').textContent=d.error;return;}state=d;render();})
  .catch(e=>$('apperr').textContent=e.message||String(e)).finally(()=>$('refreshbtn').textContent='Refresh all');
}
function refreshAll(){
  $('refreshbtn').textContent='Refreshing…';
  fetch('/v1/watch/refresh?key='+encodeURIComponent(state.accessKey)).then(r=>r.json()).then(d=>{
    if(d.error){$('apperr').textContent=d.error;return;}state=d;render();
  }).catch(e=>$('apperr').textContent=e.message||String(e)).finally(()=>$('refreshbtn').textContent='Refresh all');
}
function saveSettings(){
  const webhookUrl=$('webhook').value.trim();
  const alertEmail=$('alertemail').value.trim();
  fetch('/v1/watch/settings?key='+encodeURIComponent(state.accessKey),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({webhookUrl,alertEmail})})
  .then(r=>r.json()).then(d=>{if(d.error){$('apperr').textContent=d.error;return;}state=d;$('apperr').textContent='Saved ✓';render();})
  .catch(e=>$('apperr').textContent=e.message||String(e));
}
</script>
</body></html>`;
}

async function watchView(kv, accessKey) {
    const sub = await loadSubscription(kv, accessKey);
    if (!sub) return { error: 'invalid_key', status: 401 };
    const wl = await getWatchlist(kv, accessKey);
    return {
        accessKey,
        plan: sub.plan,
        active: sub.active,
        expiresAt: sub.expiresAt,
        storeLimit: PLAN_STORE_LIMITS[sub.plan] || 0,
        stores: wl.stores,
        webhookUrl: wl.webhookUrl || '',
        alertEmail: wl.alertEmail || '',
        updatedAt: wl.updatedAt,
    };
}

async function handleWatchGet(url, request, env) {
    const key = url.searchParams.get('key');
    const view = await watchView(env.INTEL_KV, key);
    return json(view, view.status || 200);
}

async function readJsonBody(request) {
    try { return await request.json(); } catch { return {}; }
}

async function handleWatchAdd(url, request, env) {
    const kv = env.INTEL_KV;
    const key = url.searchParams.get('key');
    const sub = await loadSubscription(kv, key);
    if (!sub) return json({ error: 'invalid_key' }, 401);
    if (!sub.active) return json({ error: 'subscription_expired', hint: 'renew at /pricing' }, 402);

    const body = await readJsonBody(request);
    const store = safeNorm(body.store);
    if (!store) return json({ error: 'missing_store' }, 400);

    const wl = await getWatchlist(kv, key);
    const limit = PLAN_STORE_LIMITS[sub.plan] || 0;
    if (wl.stores.length >= limit) return json({ error: 'plan_limit_reached', limit }, 400);
    if (wl.stores.some(s => s.store === store)) return json({ error: 'already_added' }, 400);

    wl.stores.push({ store, addedAt: new Date().toISOString(), lastChecked: null, lastChanges: [] });
    wl.updatedAt = new Date().toISOString();
    await kv.put(`watch-${key}`, JSON.stringify(wl));
    return json(await watchView(kv, key));
}

async function handleWatchRemove(url, request, env) {
    const kv = env.INTEL_KV;
    const key = url.searchParams.get('key');
    const sub = await loadSubscription(kv, key);
    if (!sub) return json({ error: 'invalid_key' }, 401);
    const body = await readJsonBody(request);
    const store = safeNorm(body.store);
    const wl = await getWatchlist(kv, key);
    wl.stores = wl.stores.filter(s => s.store !== store);
    wl.updatedAt = new Date().toISOString();
    await kv.put(`watch-${key}`, JSON.stringify(wl));
    return json(await watchView(kv, key));
}

async function handleWatchSettings(url, request, env) {
    const kv = env.INTEL_KV;
    const key = url.searchParams.get('key');
    const sub = await loadSubscription(kv, key);
    if (!sub) return json({ error: 'invalid_key' }, 401);
    const body = await readJsonBody(request);
    const webhookUrl = typeof body.webhookUrl === 'string' ? body.webhookUrl.trim().slice(0, 500) : '';
    if (webhookUrl && !/^https:\/\//.test(webhookUrl)) return json({ error: 'webhook_must_be_https' }, 400);
    const alertEmail = typeof body.alertEmail === 'string' ? body.alertEmail.trim().slice(0, 200) : '';
    if (alertEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(alertEmail)) return json({ error: 'invalid_email' }, 400);
    const wl = await getWatchlist(kv, key);
    wl.webhookUrl = webhookUrl;
    wl.alertEmail = alertEmail;
    wl.updatedAt = new Date().toISOString();
    await kv.put(`watch-${key}`, JSON.stringify(wl));
    return json(await watchView(kv, key));
}

async function checkStore(store) {
    const products = await fetchProducts(store, 0);
    return products;
}

// Refresh one watchlist entry in place; returns alert payload if changes found.
async function refreshWatchEntry(kv, entry) {
    const products = await checkStore(entry.store);
    const snapKey = `snapshot-${entry.store}`;
    const prevRaw = await kv.get(snapKey);
    let changes = [];
    if (prevRaw) {
        const prevObj = JSON.parse(prevRaw);
        changes = diffProducts(prevObj.products, products);
    }
    await kv.put(snapKey, JSON.stringify({ savedAt: new Date().toISOString(), store: entry.store, products }));
    entry.lastChecked = new Date().toISOString();
    entry.error = null;
    entry.lastChanges = changes.slice(0, 100);
    if (changes.length) return { store: entry.store, changes: changes.slice(0, 50), checkedAt: entry.lastChecked };
    return null;
}

// Refresh (a subset of) a watchlist's stores, persist, and dispatch webhook/email alerts.
async function runWatchlistRefresh(kv, wl, targetStores) {
    const targets = targetStores && targetStores.length
        ? wl.stores.filter(s => targetStores.includes(s.store))
        : wl.stores;
    const alerts = [];
    await Promise.all(targets.map(async (entry) => {
        try {
            const alert = await refreshWatchEntry(kv, entry);
            if (alert) alerts.push(alert);
        } catch (e) {
            entry.lastChecked = new Date().toISOString();
            entry.error = String(e.message || e).slice(0, 160);
        }
    }));
    wl.updatedAt = new Date().toISOString();
    await dispatchAlerts(wl, alerts);
    return alerts;
}

async function dispatchAlerts(wl, alerts) {
    if (!alerts.length) return;

    if (wl.webhookUrl) {
        for (const payload of alerts) {
            try {
                await fetch(wl.webhookUrl, {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({ source: 'shopify-change-intelligence', ...payload }),
                });
            } catch { /* webhook failures must not block the dashboard */ }
        }
    }

    if (wl.alertEmail) {
        const ok = await sendAlertEmail(wl.alertEmail, alerts);
        if (!ok) { /* logged inside; email is best-effort */ }
    }
}

function describeChange(c) {
    const labels = {
        price_increased: 'Price increased', price_decreased: 'Price decreased',
        new_product: 'New product', removed_product: 'Product removed',
        back_in_stock: 'Back in stock', out_of_stock: 'Out of stock',
    };
    let line = labels[c.changeType] || c.changeType;
    if (c.title) line += ` — ${c.title}`;
    if (c.from != null) line += `: $${c.from} → $${c.to}${c.percent ? ` (${c.percent}%)` : ''}`;
    return line;
}

async function sendAlertEmail(to, alerts) {
    try {
        const RESEND_KEY = typeof RESEND_API_KEY !== 'undefined' ? RESEND_API_KEY : null;
        if (!RESEND_KEY) return false;
        const total = alerts.reduce((n, a) => n + a.changes.length, 0);
        const lines = alerts.map(a =>
            `<h3 style="margin:16px 0 6px">${a.store}</h3>` +
            a.changes.slice(0, 20).map(c => `<div style="padding:3px 0;color:#333">• ${describeChange(c)}</div>`).join('')
        ).join('');
        const html = `<div style="font:14px/1.6 -apple-system,Segoe UI,sans-serif;color:#111">
<h2 style="margin:0 0 4px">Shopify competitor changes</h2>
<div style="color:#666">${total} change(s) across ${alerts.length} store(s) · ${new Date().toISOString()}</div>
${lines}
<hr style="border:0;border-top:1px solid #eee;margin:18px 0">
<div style="color:#888;font-size:12px">Shopify Change Intelligence · manage alerts in your <a href="https://shopify-intel.contentforge-press.workers.dev/dashboard">dashboard</a>.</div>
</div>`;
        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'authorization': `Bearer ${RESEND_KEY}`, 'content-type': 'application/json' },
            body: JSON.stringify({
                from: 'Shopify Change Intelligence <alerts@mail.contentforge.press>',
                to: [to],
                subject: `🛒 ${total} competitor change(s) on Shopify`,
                html,
            }),
        });
        return res.ok;
    } catch (e) {
        console.error('alert email failed:', String(e?.message || e));
        return false;
    }
}

async function handleWatchRefresh(url, request, env) {
    const kv = env.INTEL_KV;
    const key = url.searchParams.get('key');
    const sub = await loadSubscription(kv, key);
    if (!sub) return json({ error: 'invalid_key' }, 401);
    if (!sub.active) return json({ error: 'subscription_expired', hint: 'renew at /pricing' }, 402);

    const wl = await getWatchlist(kv, key);
    const onlyStore = safeNorm(url.searchParams.get('store'));
    await runWatchlistRefresh(kv, wl, onlyStore ? [onlyStore] : null);
    await kv.put(`watch-${key}`, JSON.stringify(wl));
    return json(await watchView(kv, key));
}

// ---- Scheduled auto-refresh (Cloudflare Cron) -----------------------------
async function scheduledScan(env) {
    const kv = env.INTEL_KV;
    let cursor;
    let scanned = 0;
    let refreshed = 0;
    do {
        const list = await kv.list({ prefix: 'watch-', cursor, limit: 100 });
        for (const item of list.keys) {
            // key format: watch-<accessKey>
            const accessKey = item.name.slice('watch-'.length);
            if (!accessKey.startsWith('sci_')) continue;
            scanned++;
            try {
                const sub = await loadSubscription(kv, accessKey);
                if (!sub || !sub.active) continue;
                const wl = await getWatchlist(kv, accessKey);
                if (!wl.stores.length) continue;
                await runWatchlistRefresh(kv, wl, null);
                await kv.put(`watch-${accessKey}`, JSON.stringify(wl));
                refreshed++;
            } catch (e) {
                console.error('scheduled watch error:', accessKey, String(e?.message || e));
            }
        }
        cursor = list.cursor;
        // Safety: KV list and fetch budgets; cap work per invocation.
        if (scanned >= 500) break;
    } while (cursor);
    console.log(`scheduled scan: ${scanned} watchlists, ${refreshed} refreshed`);
    return { scanned, refreshed };
}

function renderEmbed() {
    const snippet = '<div class="sci-widget" data-store="allbirds.com"></div>\n<script async src="https://shopify-intel.contentforge-press.workers.dev/widget.js"><\/script>';
    return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Embed the free Shopify store widget</title>
<style>
:root{--bg:#0b0e14;--card:#141925;--line:#222a3a;--fg:#e8ecf4;--mut:#8b95a7;--acc:#5b8cff}
body{margin:0;font:15px/1.6 -apple-system,Segoe UI,Roboto,sans-serif;background:var(--bg);color:var(--fg)}
.wrap{max-width:860px;margin:0 auto;padding:44px 20px}
h1{font-size:25px;margin:0 0 6px}.sub{color:var(--mut);font-size:14px;margin-bottom:24px}
.card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:20px;margin:16px 0}
.card h2{font-size:13px;color:var(--mut);text-transform:uppercase;letter-spacing:.06em;margin:0 0 12px}
pre{background:#0d1119;border:1px solid var(--line);border-radius:10px;padding:14px;overflow:auto;font-size:13px;color:#cdd6e6}
.flex{display:grid;grid-template-columns:1fr 1fr;gap:18px;align-items:start}
.note{color:var(--mut);font-size:13px}
a{color:#9db8ff}
@media(max-width:720px){.flex{grid-template-columns:1fr}}
</style></head><body><div class="wrap">
<h1>Free Shopify store widget</h1>
<div class="sub">Show live product, price and stock stats on any page — one snippet, auto-updating, free.</div>
<div class="flex">
  <div class="card">
    <h2>Preview</h2>
    <div class="sci-widget" data-store="allbirds.com"></div>
  </div>
  <div class="card">
    <h2>Paste this where you want it</h2>
    <pre id="snip"></pre>
    <div class="note">Replace <code>data-store</code> with your own domain. No signup required.</div>
  </div>
</div>
<p class="note"><a href="/">← Back to Shopify Change Intelligence</a></p>
</div>
<script>document.getElementById('snip').textContent=${JSON.stringify(snippet)};</script>
<script async src="/widget.js"></script>
</body></html>`;
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
            {
                url: '/v1/intel',
                description: 'Full-catalog competitor intelligence report: price bands, median/range, top discounts & hikes, stock signals, executive takeaways.',
                method: 'GET',
                mimeType: 'application/json',
                price: `${PRICE_INTEL_USD} USDC`,
                scheme: 'exact',
            },
            {
                url: '/v1/batch',
                description: `POST {stores:[...]} — change watch across many competitor stores at once.`,
                method: 'POST',
                mimeType: 'application/json',
                price: `${PRICE_PER_STORE_USD} USDC per store`,
                scheme: 'exact',
            },
            {
                url: '/v1/landscape',
                description: 'POST {stores:[...],anchor} — strategic competitive landscape across up to 10 stores: positioning, premium/value players, price-war and stock signals.',
                method: 'POST',
                mimeType: 'application/json',
                price: `${PRICE_LANDSCAPE_USD} USDC`,
                scheme: 'exact',
            },
        ],
    });
}

const SECURITY_HEADERS = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-site',
};

function withSecurity(response) {
    const h = new Headers(response.headers);
    for (const [k, v] of Object.entries(SECURITY_HEADERS)) h.set(k, v);
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers: h });
}

export default {
    async fetch(request, env) {
        try {
            const response = withSecurity(await handle(request, env));
            if (request.method !== 'OPTIONS') recordHit(request, response, env);
            return response;
        } catch (err) {
            // Never leak internals; log server-side only.
            console.error('unhandled:', String(err?.message || err));
            return withSecurity(json({ error: 'internal_error' }, 500));
        }
    },
    async scheduled(event, env, ctx) {
        ctx.waitUntil(scheduledScan(env));
    },
};

async function handle(request, env) {
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
                    changes: '/v1/changes?store=allbirds.com',
                    intel: '/v1/intel?store=allbirds.com',
                    batch: 'POST /v1/batch {stores:[...]}',
                    landscape: 'POST /v1/landscape {stores:[...],anchor}',
                    health: '/health',
                },
                pricing: {
                    snapshot: 'free',
                    changes: `$${PRICE_DEEP_USD} USDC`,
                    intelReport: `$${PRICE_INTEL_USD} USDC`,
                    batch: `$${PRICE_PER_STORE_USD} USDC per store (max ${BATCH_MAX_STORES})`,
                    landscape: `$${PRICE_LANDSCAPE_USD} USDC (up to ${LANDSCAPE_MAX_STORES} stores)`,
                },
            });
        }
        if (pathname === '/health') return json({ ok: true, time: new Date().toISOString() });
        if (pathname === '/.well-known/x402') return renderWellKnown();
        if (pathname === '/.well-known/glama.json') return renderGlama();
        if (pathname === '/privacy') return renderPrivacy();
        if (pathname === '/terms') return renderTerms();
        if (pathname === '/contact') return renderContact();
        if (pathname === '/pricing') return new Response(renderPricing(), { headers: { 'content-type': 'text/html; charset=utf-8' } });
        if (pathname === '/v1/subscribe') return handleSubscribe(url, request, env);
        if (pathname === '/v1/order') {
            const plan = PLANS[url.searchParams.get('plan')];
            if (!plan) return json({ error: 'invalid_plan', plans: Object.keys(PLANS) }, 400);
            return json(await createDirectOrder(plan, env.INTEL_KV));
        }
        if (pathname === '/v1/order/check') {
            const id = url.searchParams.get('id');
            const raw = id && env.INTEL_KV ? await env.INTEL_KV.get(`order-${id}`) : null;
            if (!raw) return json({ error: 'order_not_found' }, 404);
            return json(await checkDirectOrder(JSON.parse(raw), env.INTEL_KV));
        }
        if (pathname === '/dashboard') return new Response(renderDashboard(), { headers: { 'content-type': 'text/html; charset=utf-8' } });
        if (pathname === '/v1/watch') return handleWatchGet(url, request, env);
        if (pathname === '/v1/watch/add') return handleWatchAdd(url, request, env);
        if (pathname === '/v1/watch/remove') return handleWatchRemove(url, request, env);
        if (pathname === '/v1/watch/settings') return handleWatchSettings(url, request, env);
        if (pathname === '/v1/watch/refresh') return handleWatchRefresh(url, request, env);
        if (pathname === '/mcp') return handleMcp(request, env);
        if (pathname === '/robots.txt') return new Response(ROBOTS_TXT, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
        if (pathname === '/llms.txt') return new Response(LLMS_TXT, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
        if (pathname === '/sitemap.xml') return new Response(SITEMAP_XML, { headers: { 'content-type': 'application/xml; charset=utf-8' } });
        if (pathname === '/widget.js') return new Response(WIDGET_JS, { headers: { 'content-type': 'application/javascript; charset=utf-8', 'cache-control': 'public, max-age=600' } });
        if (pathname === '/embed') return new Response(renderEmbed(), { headers: { 'content-type': 'text/html; charset=utf-8' } });
        if (pathname === '/v1/widget-data') return handleWidgetData(url, request, env);
        if (pathname === '/v1/snapshot') return handleSnapshot(url, request, env);
        if (pathname === '/v1/changes') return handleChanges(url, request, env);
        if (pathname === '/v1/intel') return handleIntel(url, request, env);
        if (pathname === '/v1/batch') return handleBatch(url, request, env);
        if (pathname === '/v1/landscape') return handleLandscape(url, request, env);
        if (pathname === '/v1/admin/stats') return handleStats(url, request, env);

    return json({ error: 'not_found' }, 404);
}
