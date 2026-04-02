# Module map — PotteryMania (`lib/services/` targets)

| Service (target) | Responsibility | Plugin inspiration |
|------------------|----------------|--------------------|
| `studioService` | Onboarding, approval, profile, geo | Vendor registration + status |
| `productService` | CRUD, inventory, images | WC product binding → native `products` |
| `commissionService` | Resolve rules (global vs vendor, product vs booking), basis points | `class-commission.php` |
| `orderService` | Orders, line types, totals | WC order hooks → `orders` / `order_items` |
| `paymentService` | Stripe intents, webhooks, Connect | Processor factory pattern |
| `payoutService` | Vendor payouts (later Phase 1+) | `class-payout.php` |
| `bookingService` | Slots, capacity, bookings | New first-class domain |
| `cartService` | Product-only → hybrid | `carts` / `cart_items` |
| `entitlementService` | Plan features | License / feature gate |
| `emailService` | Resend + per-studio SMTP | `wp_mail` templates → React Email |
| `calendarService` | Google + ICS | N/A in plugins |

## API surface (working names)

- `/api/auth/*` — Auth.js
- `/api/studios/*` — studio CRUD + onboarding (vendor-facing)
- `/api/products/*`, `/api/orders/*` — Phase 1 marketplace
- `/api/bookings/*`, `/api/experiences/*` — Phase 2+

Public term: **studio** (not “vendor” in URLs copy).
