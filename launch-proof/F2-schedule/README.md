# F2 — Quick-schedule (proof pack)

**F2 = DONE only when all three sections pass. If any duplication → FAIL → back to FIX.**

## 1. Abuse test

- [ ] Screen recording **or** screenshots: **double-click** submit on guided schedule step.
- [ ] Screen recording **or** screenshots: **DevTools** “Replay XHR” on `POST …/guided/quick-schedule`.

**Suggested filenames:** `f2-abuse-double-click.mp4`, `f2-abuse-replay.png`

## 2. Database proof

- [ ] Paste or screenshot: query result showing **at most one active** `recurring_rules` row for the test experience (or policy: prior rules **inactive**, one active — document the query you used in `f2-db-query.sql` or `.txt`).

**Example check (adjust IDs):**

```sql
SELECT id, "experience_id", "is_active", weekdays, start_time, end_time
FROM recurring_rules
WHERE experience_id = '<YOUR_TEST_EXPERIENCE_ID>'
ORDER BY created_at;
```

**Suggested filenames:** `f2-db-rules.png`, `f2-db-query.sql`

## 3. UI sanity

- [ ] Screenshot: planner or booking UI — **no obviously duplicated** overlapping slots for the same pattern (or explain expected multiplicity).

**Suggested filenames:** `f2-ui-slots.png`

---

If duplicate active rules or duplicate slot chaos appears → **do not** mark F2 DONE.
