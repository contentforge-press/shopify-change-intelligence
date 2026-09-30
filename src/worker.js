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
const PRICE_INTEL_USD = 0.50;
const PRICE_PER_STORE_USD = 0.03;
const BATCH_MAX_STORES = 50;
const PRICE_LANDSCAPE_USD = 5;
const LANDSCAPE_MAX_STORES = 10;
const ADMIN_KEY = 'ba951afdb936eecd4ffb9ddfb1b44b25f47bbab1dfc391ac';

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
                    description: `PAID ($0.03 USDC per store on Base via x402, max ${BATCH_MAX_STORES}). Watch a whole set of competitor Shopify stores in one call; returns per-store change counts (new/removed/price/stock).`,
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
        if (pathname === '/mcp') return handleMcp(request, env);
        if (pathname === '/v1/snapshot') return handleSnapshot(url, request, env);
        if (pathname === '/v1/changes') return handleChanges(url, request, env);
        if (pathname === '/v1/intel') return handleIntel(url, request, env);
        if (pathname === '/v1/batch') return handleBatch(url, request, env);
        if (pathname === '/v1/landscape') return handleLandscape(url, request, env);
        if (pathname === '/v1/admin/stats') return handleStats(url, request, env);

    return json({ error: 'not_found' }, 404);
}
