# Migration decisions

## ORM / DB

- **PostgreSQL** on Railway; **Prisma 6** (schema `url` in `datasource`; avoid Prisma 7 breaking datasource change until upgrade path is planned).
- **Money**: integer **cents** everywhere (matches `DATABASE_SCHEMA.md`).

## Schema gaps closed in Prisma

- **`users`** table added (referenced by doc but missing from original SQL excerpt).
- **`experiences.cancellation_policy_id`** → FK to `cancellation_policies` (nullable `SetNull`).

## Time fields

- `booking_slots.start_time` / `end_time` and recurring rule times are **TEXT** in the initial migration (matches Prisma `String`). App layer should validate `HH:mm` / `HH:mm:ss` and compare consistently in UTC/studio timezone rules (Phase 2 scheduling service).

## Commission precedence (application rule)

1. Active **vendor** rule for `item_type` (`studio_id` set, `rule_scope = vendor`).
2. Else active **global** rule for `item_type` (`rule_scope = global`, `studio_id` null).
3. If none, block checkout or use admin fallback key in `admin_configs` (implement in `commissionService`).

## PWA

- **Manifest** `display: standalone` for installed icon UX; app remains online-first for payments and booking.

## Out of scope (v1)

- Importing encrypted IBAN / legacy rows from plugin DB (manual re-onboarding or one-off migration script later).
