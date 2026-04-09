Status: Pass (implemented in current scope).

Goal
- Ensure wearables are categorized consistently for browsing and operations.

Implemented
- Added category taxonomy and resolver in `lib/wear-categories.ts`.
  - Categories: `tops`, `hoodies`, `headwear`, `accessories`, `other`.
  - Resolver uses slug/name/subtitle/description keyword matching.
- Public wear APIs now include category metadata:
  - `GET /api/wear/products` returns `category` + `categoryLabel`.
  - Supports optional `?category=<key>` filtering.
- Wear shop now supports category-first browsing:
  - `app/wear/shop/page.tsx` adds category pills and grouped sections.
- Wear PDP now surfaces category context:
  - `app/wear/[slug]/page.tsx` shows category label.
- Hyperadmin wear listing now shows category:
  - `app/admin/wear-products/page.tsx`
  - `components/admin/wear-products-admin-client.tsx`
  - `GET /api/admin/wear-products` includes category fields.
- Hyperadmin product edit screen now shows computed category:
  - `app/admin/wear-products/[id]/page.tsx`
  - `components/admin/wear-product-editor-client.tsx`

Verification
- Added tests:
  - `lib/wear-categories.test.ts`
- Executed:
  - `npm run test -- lib/wear-categories.test.ts`
  - Result: 1 file, 6 tests, all passing.
