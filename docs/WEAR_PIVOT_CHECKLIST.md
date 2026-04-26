# Wear / apparel pivot — task checklist

**Purpose:** Move from current PotteryMania surface (mixed pottery/booking + wear) to a **minimal, high-converting global apparel** experience (Spreadconnect, identity-led, no marketplace confusion).

**How to use:** Mark items `- [x]` when done. Update this file after each completed task (or batch).

**Last updated:** 2026-04-26 (admin wear markup %, PDP image sort by Spreadconnect perspective, richer alts)

---

## Phase 0 — Lock the target

- [x] Write the one-line brand promise for apparel (one sentence, no pottery/booking words). → *Shipped on `/wear` hero: “Clothes for people who build things with their hands.”*
- [ ] ~~Freeze catalog: 2 tees + 1 hoodie only until Drop 02 is defined.~~ **Skipped** — catalog is whatever is live in Spreadconnect / synced to the site.
- [ ] Pick primary storefront currency (or rule: show X, charge at checkout in Y).
- [ ] Paste Spreadconnect COGS + typical shipping per SKU/region into a spreadsheet (pricing source of truth).

---

## Phase 1 — Map reality (what we have now)

### Site & routes

- [ ] List all public URLs that mention pottery, studios, classes, bookings, marketplace, or directory.
- [ ] Map `/wear` tree: home (`/wear`), shop (`/wear/shop`), PDP (`/wear/[slug]`), cart, checkout success, errors.
- [ ] Map global nav: links on marketing home vs wear layout vs footer (booking vs shop leakage).

### Commerce

- [ ] Confirm Stripe + Spreadconnect flow: cart → checkout → webhooks → order states.
- [ ] Confirm how shipping is shown (line item vs included; regional variance).
- [ ] Document current PDP blocks: gallery, title, price, variants, shipping text, related clutter.

### Affiliate / partner

- [ ] Locate partner/reseller entry points (footer, components, external form).
- [ ] Document commission rules as implemented (%, caps, cookies, attribution window if any).
- [ ] Document payout process (manual, tool, min threshold).

### Content & SEO

- [ ] Export current titles/meta for `/`, `/wear`, and each live PDP.
- [ ] Note any `llms.txt`, structured data, or social cards that still say “pottery platform” vs “apparel.”

### Analytics

- [ ] List events/funnel you actually have (PDP → cart → purchase).
- [ ] Identify gaps (no PDP event, no affiliate click event, etc.).

---

## Phase 2 — Define gaps (now → want)

### Brand & narrative

- [x] Gap closed: Homepage/hero aligned to identity/belonging/drop (not network/directory/booking). → *`/wear` landing reworked.*
- [x] Gap closed: Wear path uses buyer-only language; mixed artist vs customer resolved. → *Removed creator-margin hero / studio bridge from `/wear`; buyer-first CTAs.*

### Store structure

- [x] Gap closed: Wear landing ≤3 sections (hero + drop + proof/shipping) or documented exception.
- [x] Gap closed: No unnecessary categories/filters for 3 SKUs (removed or hidden). → **Superseded:** category filters always available when the synced catalog has categories (no artificial hide-by-count).

### Pricing

- [ ] Gap closed: Retail tied to SC COGS + margin policy; tee band + hoodie anchor set.
- [ ] Gap closed: Psychological pricing rule consistent per market.

### Shipping

- [x] Gap closed: Transparent shipping messaging (Option B) + EU/US/ROW ranges on PDP/cart. → *`lib/wear-shipping-copy.ts` + PDP strip + cart note + landing section 3.*
- [x] Gap closed: No surprise shipping at pay; line items clear. → *Copy aligned; Stripe still owns final line items.*

### Product pages

- [x] Gap closed: PDP copy = hook + identity + 3 benefit bullets + delivery + light proof.
- [x] Gap closed: Image order = hero → front → detail → context. → *`sortWearCatalogImagesForDisplay` on `/wear/[slug]` (and studio wearables PDP) using `perspective` from sync; JSON array order for unknowns.*

### Affiliate

- [x] Gap closed: Partner page documents %, cookie duration, payout, natural content angles. → *`/wear/partner` + live default studio margin from admin; affiliate terms “in agreement”.*
- [x] Gap closed: Affiliate hooks not salesy on primary shop path. → *Hero links to `/wear/partner`; post-checkout one line only.*

### Drop system

- [ ] Gap closed: Drop 01 name, theme, date, SKU naming convention locked.

### Kill list

- [x] Gap closed: Booking/studio/discovery CTAs removed or excluded from wear + checkout paths. → *`/wear` landing: removed “Studio platform” / setup studio / pricing bridge; shop empty state: removed `/demo` studio CTA.*
- [x] Gap closed: Forbidden positioning terms scrubbed on wear paths (directory, marketplace, etc.). → *Wear layout uses `apparelStorefront` footer + header: no marketplace/classes footer grid; cart → `/wear/cart`; guests see Shop/Drop not “Register for free”. (Full rest-of-site unchanged.)*

---

## Phase 3 — Execute (ship in order)

### Pricing & catalog

- [ ] Set retail prices from spreadsheet; verify margin vs wear admin config (`wear_*_margin_bps`).
- [ ] ~~Hide/disable any wear SKUs not in the 3-SKU drop (catalog flags / admin).~~ **Skipped** — manage assortment in Spreadconnect / admin visibility as you already do.

### Wear UX (minimal store)

- [x] Rebuild `/wear` landing to 3 sections: hero, drop row, shipping/trust strip.
- [x] Simplify `/wear/shop` to single list of 3 products (no clutter). → **Adjusted:** shop shows full synced catalog with category chips when applicable; copy reflects production sync.
- [x] Tighten wear layout / subnav: Shop · Cart · Partner (or fewer). → *Subnav: Drop · Shop · Cart · Partner.*

### PDP

- [x] Apply conversion wireframe to each `wear/[slug]`: hook, identity, benefits, variants, CTA, delivery block. → *`wear-product-gallery.tsx` + shared shipping copy.*
- [x] Set image order and alt text per PDP. → *Perspective-based sort + alt includes name, appearance, perspective.*

### Cart & checkout

- [x] Mobile pass: PDP → cart → checkout (thumb reach, no extra steps). → *Sticky add-to-cart bar on PDP (`md:hidden`); extra bottom padding on PDP main.*
- [x] Cart/checkout shipping copy matches PDP (transparent shipping).

### Affiliate

- [x] Publish/refresh partner page: commission %, cookie length, payout rules, content angles.
- [x] Entry points: footer + optional post-purchase; no hero clutter.

### Drop & brand

- [x] Surface “Drop 01 — [theme]” in UI where helpful; no marketplace language. → *Label on `/wear` + shop H1 context.*
- [x] Update meta/OG for `/wear` and PDPs to apparel/identity positioning. → *Titles/descriptions updated for `/wear`, `/wear/shop`, `/wear/cart`, PDP “— Shop”.*

### Kill list (implementation)

- [x] Remove or reroute booking/studio CTAs from wear layout and checkout. → *+ `SiteHeader` + `MarketingLayout` apparel mode: hide Create studio / My bookings on `/wear/*`; minimal footer.*
- [x] Repo pass: forbidden terms on wear paths fixed. → *Covered for `/wear/*` shell; spot-check other routes separately.*

### QA

- [ ] Test purchase: EU + non-EU scenario (shipping display + total).
- [ ] Test affiliate link end-to-end if applicable.
- [ ] Basic a11y / performance spot-check on PDP and cart.

### Launch

- [ ] Brief affiliates: 3 hooks + link to partner terms.
- [ ] Monitor funnel 7 days; then plan Drop 02.

---

## Phase 4 — Done definition (acceptance)

- [ ] Shop path: a new visitor can buy without understanding pottery SaaS.
- [x] Affiliate can explain the offer in one sentence + link. → *“Share the drop — earn on pieces people actually wear” + `/wear/partner`.*
- [x] No booking/directory confusion on shop + checkout paths. → *Apparel header/footer on all `/wear/*`.*
- [x] Shipping clear before pay; prices feel premium but fair. → *Copy in place; pricing still business-owned.*
- [ ] ~~Only three live apparel SKUs with a named drop and story.~~ **Skipped** — SKU count follows Spreadconnect / DB; “Drop 01” remains narrative framing only.

---

## Notes / decisions log

(Add dated bullets as you decide: e.g. shipping model, currency, default commission %.)

- 2026-04-25: Checklist file created; no execution tasks marked complete yet.
- 2026-04-26: **Code shipped** — `lib/wear-shipping-copy.ts`; `/wear` 3-section `WearPage`; `WearSubnav` + `WearLayoutShell` partner link; shop small-catalog filter hide + empty-state CTAs; PDP hook/benefits/shipping strip; cart shipping note; metadata tweaks. See git diff for files touched.
- 2026-04-26: **`apparelStorefront`** — `MarketingLayout` + `SiteHeader` props from `WearLayoutShell`: minimal shop footer, guest nav Shop/Drop, cart → `/wear/cart`, strip studio/booking noise for logged-out buyers on wear routes.
- 2026-04-26: **`/wear/partner`** — program copy + apply CTA; subnav Partner → page; apparel footer link; success page hook; mobile PDP sticky ATC.
- 2026-04-26: **Catalog scope** — Removed small-catalog filter hiding; shop copy + meta describe sync with production (Spreadconnect-driven assortment). Explicit 3-SKU tasks marked skipped in checklist.
