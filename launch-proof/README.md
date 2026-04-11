# Launch proof — Column 4 unlock

This directory holds **evidence only**. No code here.

Mark a gate **DONE** only when the matching subfolder contains the artifacts listed in that folder’s `README.md`.

**Rules**

- Redact secrets (tokens, full card numbers, personal emails if publishing).
- Prefer dated filenames: `YYYY-MM-DD-description.png`.
- Do not commit production credentials; use staging or test mode.

**Gate summary**

| Folder      | Gate |
|------------|------|
| `F1-email/` | F1 — Email system |
| `F2-schedule/` | F2 — Quick-schedule |
| `F3-ci/` | F3 — CI / typecheck |
| `V1-flow/` | V1 — Full flow S1–S11 |
| `V2-mobile/` | V2 — Mobile |
| `V3-wear/` | V3 — Wear PDP |
| `V4-stripe/` | V4 — Stripe + webhooks |

**Beta GO** (from protocol): F1 + F2 + F3 proof packs, V1 basic pass, V4 Stripe verified, V2 minimal mobile.

**Public GO**: all of the above, full V1 (100%), V4 webhook retry confirmed, SPF/DKIM/DMARC clean, UX hesitation cleared.
