# WordPress / WooCommerce dependency map

| Plugin / WP concept | PotteryMania replacement |
|---------------------|---------------------------|
| `wp_users` + roles | `users` + `UserRole` enum |
| `get_option` / `update_option` | `admin_configs` + typed config service |
| `wp_cron` | Railway **queue** (BullMQ + Redis) — add when first background job ships |
| `set_transient` | Redis cache (optional) |
| WC `product` post + meta | `products` + `product_images` |
| WC orders / items / refunds | `orders` + `order_items` + `payments` |
| `_oktana_vendor_id` on product | `products.studio_id` |
| `wp_mail` + PHP templates | Resend + HTML/React templates |
| Shortcodes / rewrites | Next.js App Router pages |
| Media attachments | Object storage URLs (`logo_url`, `image_url` fields) |
| Stripe account in `user_meta` | `stripe_accounts.studio_id` |

## Hyperadmin

| Concept | Replacement |
|---------|-------------|
| License keys for WP sites | Stripe subscriptions + `feature_flags` / plan on `studios` (evolve in Phase 4) |
| Viva / WC license checkout | Stripe Checkout + webhooks |
| `wp_remote_*` | `fetch` / Stripe SDK |
