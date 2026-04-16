# Spreadconnect — Production Execution Protocol

Canonical reference for **Option A** (central integration + local commerce brain).  
Code anchors: `lib/wear-public-filter.ts`, `lib/wear-spreadconnect-catalog-sync.ts`, `lib/wear-order-spreadconnect.ts`, `lib/spreadconnect-config.ts`, `app/api/cron/wear-catalog-sync`, `app/api/cron/wear-sku-integrity`, `app/api/cron/wear-fulfillment-jobs`.

---

## Phase 1 — Reality Validation

### A. Spreadconnect API (from `docs/reference/spreadconnect-openapi.json` + runtime behavior)

| Capability | Evidence | Classification |
|------------|----------|----------------|
| `GET /articles`, `GET /articles/{articleId}` | OpenAPI + used in `syncSpreadconnectCatalogToWearProducts` | **Verified in app** |
| `POST /orders` | OpenAPI + `lib/wear-order-spreadconnect.ts` | **Verified in app** |
| `POST /articles` (create article) | OpenAPI: PNG URL or `designId`, variants, `ArticleCreation` schema | **Documented** — **not** wired in PotteryMania sync (read-only sync today) |
| `POST /designs/upload` | OpenAPI: `multipart/form-data`, returns `designId` | **Documented** — **not** called by PotteryMania today |
| Rate limits | **Not** specified in checked-in OpenAPI | **Unverified** — treat as unknown; use env throttles (`SPREADCONNECT_*_GAP_MS`, page limits) |
| Production vs staging | `SPREADCONNECT_ENV`, `NODE_ENV`, `SPREADCONNECT_ALLOW_LIVE_SUBMISSION` in `lib/spreadconnect-config.ts` | **Verified in app** |

**Classification summary**

- **Fully verified (today):** Read catalog + submit order with API key; env-based live gate; deferred jobs when live off.
- **Partially verified:** POST article/design — schema exists; **live** success depends on asset quality, print areas, product-type IDs — must be validated in **your** Spreadconnect account with real payloads.
- **Unsupported / unreliable if assumed:** Silent success on sync without checking `skippedArticles`; assuming full catalog without `fullDiscovery` or scheduled full scan.

### B. PotteryMania — Current Truth

| Area | Reality |
|------|---------|
| **Sync completeness** | **Partial by default:** `SPREADCONNECT_SYNC_DISCOVER_MAX_PAGES` (default 1) limits list discovery; known `spreadconnectArticleId` rows refreshed by id; `fullDiscovery` / env `SPREADCONNECT_SYNC_FULL_DISCOVERY=1` for full list scan. **Not all upstream articles are guaranteed locally** unless discovery covers them or they are already linked. |
| **SKU integrity** | Variants require `sku` for sync mapping (`prepareArticle` skips otherwise). Fulfillment: `resolveSpreadconnectSku` uses variant `sku` or `externalFulfillmentId`. **Duplicates possible** if DB manually corrupted — `findDuplicateWearVariantSkus()` + cron `wear-sku-integrity` alert. |
| **SKU drift** | Local fingerprint (`spreadconnectCatalogFingerprint`) reduces redundant writes; upstream can change titles/prices — **detected on next sync** when fingerprint changes. |
| **Publish gates** | **Single rule:** `wearPublicProductWhere()` — active, not archived, `publishStatus: published`, `assetHealthStatus: ready`, positive price (product or variant), and **fulfillable identity** (non-empty `externalFulfillmentId` **or** ≥1 active variant with non-empty `sku`). **Enforced** on shop, APIs, checkout, sitemap, preview, studio catalog **after hardening** (studio API aligned). |
| **Studio activation** | `StudioWearProduct` + `StudioWearConfig`; selection API **must** only allow ids passing `wearPublicProductWhere()` (fixed). |
| **Order failure** | Missing SKU / bad address / API error → `wear_spreadconnect_failed` analytics + escalation (`wear-order-escalate`); live off → deferred job (`wear-fulfillment-jobs`). Retries via worker with backoff — **not** infinite. |

---

## Phase 2 — Hardening Implemented (Concrete)

1. **Canonical public filter** — `lib/wear-public-filter.ts` (price + SKU identity + publish/health).
2. **Studio API alignment** — `app/api/studios/[studioId]/wear/route.ts` uses same filter for catalog + PATCH validation.
3. **Health snapshot** — `lib/wear-catalog-health.ts`: counts + samples match public shop; **duplicate SKU** metrics; Spreadconnect linkage counts.
4. **Catalog sync anomaly alert** — `app/api/cron/wear-catalog-sync/route.ts`: warns if ≥85% of fetched articles skipped (24h dedupe).
5. **SKU duplicate cron** — `app/api/cron/wear-sku-integrity/route.ts` + `lib/wear-sku-integrity.ts`: read-only check; admin notification (24h dedupe).

**Do not touch without review:** Core order settlement (`settleCheckoutOrderPayment`), Stripe Connect mixed checkout money flow, Spreadconnect order payload shape (unless API version changes).

---

## Phase 3 — Automation Expansion (Not Built Here)

### API-based product creation

- **Feasible per OpenAPI:** `POST /designs/upload` + `POST /articles` with product type IDs, variants, PNG URLs or `designId`.
- **Not implemented** in repo as a pipeline — requires: secure asset storage, validation, print-area QA, idempotent article keys, then **optional** call sync or poll `GET /articles/{id}`.

### Recommended path if automating

1. **Batch worker** (separate job) calling Spreadconnect **staging** first.
2. Persist returned `articleId` → trigger or wait for `syncSpreadconnectCatalogToWearProducts`.
3. New rows land as **draft / not published** until Hyperadmin sets `publishStatus` + `assetHealthStatus` (or automated image HEAD check passes).

**Fallback if API QA fails:** manual article creation in Spreadconnect UI → existing sync — still Option A.

---

## Phase 4 — Final Architecture (Concrete Flow)

1. **Upstream:** Designs + articles live in **your** Spreadconnect account (UI and/or future API worker).
2. **Sync layer:** Cron `wear-catalog-sync` → `GET /articles` + `GET /articles/{id}` → upsert `WearProduct` / `WearProductVariant`, fingerprint, skip invalid rows.
3. **Local catalog:** PotteryMania DB = visibility, pricing, margins, studio selection; **never** studios creating POD SKUs.
4. **Studio activation:** `StudioWearProduct` points to rows passing `wearPublicProductWhere()`.
5. **Pricing:** Base from sync + `calculateWearPrice` + global/studio margin caps (`lib/wear-commission.ts`).
6. **Checkout:** Stripe session → payment → `submitPaidWearOrderToSpreadconnect` (gated) → `POST /orders` with SKUs + shipping from session.
7. **Failures:** Analytics + escalation + optional deferred jobs + admin notifications.

---

## Phase 5 — Execution Decision

**Proceed with Option A with modifications** — modifications = **operational gates + metrics + studio API parity** (implemented above). No architecture replacement.

---

## Phase 6 — Build Order

### P0 — Blockers before scale

| Item | Purpose | Outcome |
|------|---------|---------|
| `wearPublicProductWhere()` rules | No broken/unsellable rows on any customer path | Fewer chargebacks / support |
| Cron `wear-catalog-sync` + `CRON_SECRET` | Fresh data | Less drift |
| Full discovery on schedule (e.g. weekly) + `wear_catalog_sync_completed` events | Coverage | New upstream articles appear |
| Monitor `wear_spreadconnect_failed` + finance-reconcile wear alert | Failures visible | No silent POD loss |
| Live submission only when `SPREADCONNECT_ALLOW_LIVE_SUBMISSION` + prod + flag | No accidental prod orders in staging | Safety |

### P1 — High value early

| Item | Purpose | Outcome |
|------|---------|---------|
| Cron `wear-sku-integrity` | Duplicate SKU visibility | Safer fulfillment |
| Hyperadmin wear health UI consuming snapshot | Ops clarity | Faster triage |
| High skip-ratio notification (implemented) | Bad upstream data signal | Proactive fix |

### P2 — Enhancements

| Item | Purpose | Outcome |
|------|---------|---------|
| API “catalog builder” pipeline | Less manual UI in Spreadconnect | Throughput |
| Spreadconnect webhooks (if subscribed) | Faster than poll-only | Lower latency sync |

---

## Phase 7 — Red Flags (Do Not Go Live)

- `SPREADCONNECT_API_KEY` missing, `__PENDING__`, or shared across insecure environments.
- No cron for sync + no periodic **full** discovery — **expect missing SKUs in shop**.
- `duplicateSkuGroupCount` > 0 at scale without remediation — **ambiguous** fulfillment.
- Live submit enabled while checkout shipping data **not** validated for target regions (US/CA state rules in code).
- **Zero** monitoring of `wear_spreadconnect_failed` / admin notifications.

---

## Schedule Reference (HTTP cron)

- `GET /api/cron/wear-catalog-sync` — Bearer `CRON_SECRET` (default **partial** discovery; run **full** via admin “Full catalog scan” or set `SPREADCONNECT_SYNC_FULL_DISCOVERY=1` / `fullDiscovery: true` on the admin POST).
- `GET /api/cron/wear-sku-integrity` — weekly (duplicate SKU detection + optional notification). Optional: **`WEAR_AUTO_HIDE_DUPLICATE_SKU_PRODUCTS=true`** sets affected rows to `publishStatus: hidden` and `assetHealthStatus: invalid` so they cannot appear publicly until fixed (destructive; enable only when you want strict containment).
- `GET /api/cron/wear-fulfillment-jobs` — frequent when deferred jobs expected.

---

## Internal health score (0–100, operator-only)

Computed in `lib/wear-internal-health-score.ts` from trust state, duplicate SKU groups, published-but-not-eligible count, SC failures (24h), and sampled broken image HEAD checks. Surfaced on `/admin/wear-products` and `GET /api/admin/wear-catalog-health`. Not shown to customers.

---

## Catalog trust state (implemented)

Computed in `lib/wear-catalog-trust.ts` from:

- `admin_configs` keys written by `recordWearCatalogSyncSuccess` / `recordWearCatalogSyncFailure` (`lib/wear-catalog-sync-state.ts`)
- Live duplicate SKU groups (`findDuplicateWearVariantSkus`)
- Last recorded `skipRatio` on successful sync

| State | Meaning |
|-------|---------|
| `VERIFIED` | Full discovery sync recorded within ~36h, no duplicate SKUs, skip ratio &lt; 85%, no sync error flag |
| `DEGRADED` | Full sync fresh but duplicate SKUs and/or abnormal skip ratio |
| `UNVERIFIED` | No full sync on record, or full sync older than window |
| `FAILED` | `wear_catalog_last_sync_error` set (cleared on next successful sync) |

**Rule:** Partial sync alone never implies full catalog coverage — trust requires a **recent full discovery** run on a schedule (e.g. daily) plus frequent partial cron.

---

## Admin API probes (staging / controlled)

Set **`SPREADCONNECT_PROBE_ENABLED=true`** on the host. Hyperadmin only:

- **`GET /api/admin/wear-spreadconnect/probe`** — whether probes are enabled, env, allowed actions (no writes).
- **`POST /api/admin/wear-spreadconnect/probe`** — JSON body:
  - `{ "action": "authentication" }` → `GET /authentication` (read-only key check).
  - `{ "action": "design_from_url", "imageUrl": "https://...png" }` → `POST /designs/upload` (multipart `url` field).
  - `{ "action": "create_article", "article": { ...ArticleCreation } }` → `POST /articles` (tenant-specific product type / size / appearance IDs required).

Actions are audit-logged. OpenAPI rate limit: **60 calls/minute per integration**. Disable the env flag when not testing.

---

## Upstream product creation (Workstream B — not automated in app yet)

Validated in `docs/reference/spreadconnect-openapi.json`: `POST /designs/upload`, `POST /articles`. **Recommended path:** prove all four probes (upload → article → sync pickup → sell) in **staging**, then implement **Level 2** (assisted queue + operator review) before Level 3. Do not auto-publish new articles from automation — land as `draft` / non-public locally until reviewed.

---

*Last aligned with codebase: `wear-catalog-trust`, `wear-catalog-sync-state`, sync routes, admin merch card.*
