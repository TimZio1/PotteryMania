Status: Pass (implemented in current scope).

Goal
- Allow any registered account to include a studio profile in PotteryMania's database + map for free, with limited functionality.

Implemented
- `POST /api/studios` now supports `listingOnly: true` for non-vendor accounts.
- Free-listing studio creation auto-approves profile visibility (`status=approved`, `approvedAt` set), so the listing appears in:
  - `/studios` directory + map search results
  - `/api/studios/public` responses
- Paid/advanced capabilities remain gated:
  - Product listing still requires activation (`activationPaidAt`).
  - Experience listing still requires activation (`activationPaidAt`) and vendor flow.
- Public studio page now allows empty-offering profiles when studio is not activated (listing-only mode), with explicit "Free listing profile" notice.

UX entry point
- Customer dashboard now includes `Add my studio (free map listing)` CTA to `/dashboard/studio/new?listing=free`.
- Studio creation form switches to free-listing mode and submits `listingOnly: true`.

Verification
- Added API contract tests:
  - `lib/api-contract/studios-route.contract.test.ts`
  - Covers unauthorized, non-vendor blocked without flag, customer free-listing success, and vendor draft flow preservation.
