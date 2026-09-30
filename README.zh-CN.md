# Shopify Change Intelligence（Shopify 变化情报）

[English](README.md) · **简体中文**

一个**零依赖**的 Cloudflare Worker，用于监控任何**公开的 Shopify 店铺**，并把"变化情报"卖给 AI。AI 智能体通过原生 **x402** 协议用 **Base 链上的 USDC** 自动付费——无需平台账号、无需支付通道、0 抽成。

**npm：** [`shopify-change-intelligence`](https://www.npmjs.com/package/shopify-change-intelligence) —— 运行 `npx shopify-change-intelligence` 即可打印托管服务的 MCP 客户端配置。

## 它能做什么

从免费数据到精炼结论，共五档：

- `GET /v1/snapshot?store=allbirds.com` —— **免费**。实时商品目录快照（商品数、价格区间、可售情况）。
- `GET /v1/changes?store=allbirds.com` —— **$0.05**。相对上一次快照的原始变化：新品/下架、涨价/降价、补货/断货。
- `GET /v1/intel?store=allbirds.com` —— **$0.50** ⭐。完整竞品情报报告：价格带、中位数/区间、最大折扣与涨价、库存信号、自动生成的经营要点。
- `POST /v1/batch` —— **每店 $0.03**（上限 50 店）。请求体 `{"stores":["a.com","b.com"]}`，一次监控一整组竞品并返回每店变化数。
- `POST /v1/landscape` —— **$5**（上限 10 店）。多店竞争格局：把你的店与同行定位，标出高端/性价比玩家、价格战与库存信号。
- `GET /mcp` —— MCP（Streamable HTTP 上的 JSON-RPC），把以上能力作为工具暴露。`GET /` 是落地页，`GET /v1` 是 JSON 清单，`GET /health` 是健康检查。

调用付费接口但未付费时，服务返回 `402 Payment Required` 并带一个 base64 编码的 `PAYMENT-REQUIRED` 头。支持 x402 的智能体会完成一笔 USDC 结算，放进 `PAYMENT` 头重试；Worker 通过 x402 facilitator 进行验证与结算。

## 架构

- **运行时：** Cloudflare Workers（原生 `fetch`，无框架、无 npm 依赖）。
- **结算：** x402 协议，Base 主网（chainId 8453），USDC 合约 `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`。
- **Facilitator：** `https://x402.org/facilitator`（`/verify`、`/settle`）。
- **存储（可选）：** Workers KV 命名空间 `INTEL_KV`，用于历史快照；没有它服务也能运行（免费快照始终实时，变化检测以空基线对比）。

## 合规与联系

- [隐私政策 / Privacy](https://shopify-intel.contentforge-press.workers.dev/privacy)
- [服务条款 / Terms](https://shopify-intel.contentforge-press.workers.dev/terms)
- [联系与举报 / Contact](https://shopify-intel.contentforge-press.workers.dev/contact)

## 许可证

MIT
