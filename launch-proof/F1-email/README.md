# F1 — Email System (Certification Proof Pack)

**F1 = DONE only when ALL sections below contain real artifacts in this folder.  
No assumptions. No partial credit.**

---

# 🔥 1. FAILURE PROOF (MANDATORY)

## Goal:
Prove that email failure is **visible to the user** and **never silent**.

### Required:

- [ ] Screenshot: register with **invalid or missing `RESEND_API_KEY`** (staging).
- [ ] Screenshot: UI shows alert containing:
  → “We couldn’t send your verification email”  
  OR explicit misconfiguration message from API.
- [ ] (Strongly recommended) Log snippet:
  - contains `EmailTransportError` OR failed send trace
  - proves backend did NOT silently succeed

### MUST BE TRUE:

- ❌ No “success” message shown in UI
- ❌ No redirect pretending everything worked
- ❌ No silent failure

---

# 🟢 2. SUCCESS PROOF (MANDATORY)

## Goal:
Prove that email works end-to-end for a real user.

### Required:

- [ ] Screenshot: successful registration UI (201 path)
- [ ] Screenshot: **inbox view**
  - email is visible
  - timestamp visible
- [ ] Screenshot: **email body**
  - verification link clearly visible

### MUST BE TRUE:

- Email arrives within **≤ 10 seconds**
- Sender is correct (`RESEND_FROM` domain)
- Subject is correct and readable
- No spam folder delivery

---

# 🛡️ 3. DELIVERABILITY PROOF (MANDATORY)

## Goal:
Prove email is trusted by providers (not just “sent”).

### Required:

- [ ] Screenshot of message headers OR Resend dashboard showing:
  - SPF = PASS  
  - DKIM = PASS  
  - DMARC = PASS  

### MUST BE TRUE:

- Domain matches your production domain (not `resend.dev`)
- No “via resend” or “unverified sender” warnings
- No Gmail yellow/red warnings

---

# 📁 FILE NAMING (STRICT)

All files must follow this format:

- `f1-failure-register-ui.png`
- `f1-failure-server-log.txt`
- `f1-success-register.png`
- `f1-success-inbox.png`
- `f1-success-email-body.png`
- `f1-dkim-spf-dmarc-headers.png`

---

# 🚫 AUTOMATIC FAIL CONDITIONS

F1 is NOT DONE if:

- Any checkbox is missing
- Email arrives in spam
- Headers are not verified
- Failure scenario does not show UI alert
- Sender domain is not production-ready
- Email takes >10 seconds consistently

---

# 🚦 GATE IMPACT

## Beta Launch:
Allowed ONLY IF:
- Failure proof exists
- Success proof exists

## Public Launch:
Blocked UNTIL:
- Deliverability proof is complete
- Domain is verified and trusted

---

# 🧠 FINAL RULE

> “Email works” is NOT enough.  
> It must be **visible, fast, trusted, and impossible to fail silently.**

---

# ✅ COMPLETION

When ALL conditions above are satisfied:

→ Mark **F1** as DONE in the master launch board  
→ Link this folder as proof