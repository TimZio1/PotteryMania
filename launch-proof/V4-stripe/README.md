# V4 — Stripe (Critical Certification Proof)

**Execute (automated slice):** from `potterymania/` run `.\scripts\v4-stripe-proof.ps1` → refreshes `automated/v4-dedup-vitest-log.txt`.  
**Execute (manual / screenshots):** follow **`RUNBOOK.md`** in this folder.

**V4 = DONE only when ALL sections below contain real, correlated evidence.  
Stripe ≠ success screen. Stripe = event lifecycle integrity.**

---
## Certification status

V4 is split into two layers:

### Layer A — Automated proof
Covered by:
- `scripts/v4-stripe-proof.ps1`
- `lib/stripe-webhook-dedup.test.ts`
- output logs in `launch-proof/V4-stripe/automated/`

This proves the idempotency logic is implemented and rerunnable.

### Layer B — Runtime proof
Still required:
- real checkout success artifact
- real Stripe Dashboard event artifact
- real app webhook log artifact
- real retry/no-duplicate artifact
- real DB state artifact

**V4 = DONE only when both Layer A and Layer B are complete.**
# 🔥 CORE PRINCIPLE

> Every Stripe event must be:
> 1. Received
> 2. Processed
> 3. Idempotent (safe to replay)

---

# 🟢 1. PAYMENT SUCCESS (MANDATORY)

## Goal:
Prove a real user can complete checkout successfully.

### Required:

- [ ] Screenshot: Stripe Checkout success page  
  OR  
- [ ] Screenshot: your app success redirect (`/checkout/success?...`)

### MUST BE TRUE:

- Payment uses **Stripe test card (4242…)**
- Session ID visible in URL or logs
- No frontend errors during redirect

---

# 🧠 2. WEBHOOK RECEIVED (MANDATORY)

## Goal:
Prove your backend processes Stripe events.

### Required:

- [ ] Screenshot: Stripe Dashboard event  
  - type: `checkout.session.completed`  
  - **event ID visible**
- [ ] Screenshot or log snippet: your app handling this event  
  - includes same session ID or event ID

### MUST BE TRUE:

- Event timestamp matches checkout
- App log shows **successful handling**
- No errors in webhook route

---

# ⚠️ 3. WEBHOOK RETRY (MANDATORY — PUBLIC GATE)

## Goal:
Prove your system is **idempotent** (cannot double-charge / double-fulfill)

### Required:

- [ ] Resend SAME event from Stripe Dashboard (or CLI)
- [ ] Screenshot/log proving:
  - event was received again
  - system detected duplicate OR safely ignored

### MUST BE TRUE:

- ❌ No duplicate order created
- ❌ No duplicate booking / fulfillment
- ✔ Existing record unchanged OR safely re-acknowledged

---

# 🔍 4. STATE CONSISTENCY CHECK (NEW — MANDATORY)

## Goal:
Prove your database matches Stripe truth.

### Required:

- [ ] Screenshot or DB query result:
  - order/payment marked **paid**
  - correct user/studio association
- [ ] Optional (strong):
  - show payment amount matches Stripe

### MUST BE TRUE:

- No “paid in Stripe but missing in DB”
- No “pending in DB after success”

---

# 📁 FILE NAMING (STRICT)

- `v4-checkout-success.png`
- `v4-stripe-event-dashboard.png`
- `v4-app-webhook-log.txt`
- `v4-retry-no-duplicate.png`
- `v4-db-state-after-payment.png`

---

# 🚫 AUTOMATIC FAIL CONDITIONS

V4 is NOT DONE if:

- Only frontend success is shown (no webhook proof)
- Event not visible in Stripe Dashboard
- Webhook not logged in your app
- Retry creates duplicate data
- DB state does not match Stripe
- Any webhook error appears in logs

---

# 🚦 GATE IMPACT

## Beta Launch:
Allowed ONLY IF:
- Payment success proven
- Webhook received proven

## Public Launch:
BLOCKED UNTIL:
- Webhook retry proven
- Idempotency confirmed
- DB state consistency confirmed

---

# 🧠 FINAL RULE

> If Stripe sends the same event twice and your system breaks →  
> your product is NOT safe to launch.

---

# ✅ COMPLETION

When ALL conditions are satisfied:

→ Mark **V4** as DONE in launch board  
→ Link this folder as proof