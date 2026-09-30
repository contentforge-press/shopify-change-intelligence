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
async function handleSnapshot(url) {
    const store = normDomain(url.searchParams.get('store'));
    if (!store) return json({ error: 'Missing ?store= domain' }, 400);
    try {
        const products = await fetchProducts(store, FREE_MAX_PRODUCTS);
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

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const { pathname } = url;

        if (pathname === '/' || pathname === '/v1') {
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
        if (pathname === '/v1/snapshot') return handleSnapshot(url);
        if (pathname === '/v1/changes') return handleChanges(url, request, env);

        return json({ error: 'not_found' }, 404);
    },
};
