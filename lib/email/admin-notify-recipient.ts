/**
 * Inbox for operator alerts (catalog leads, new accounts, etc.).
 * Override with REGISTRATION_NOTIFY_EMAIL (or other vars in the chain) on hosting.
 */
const DEFAULT_PRODUCTION_NOTIFY_EMAIL = "theorh72@gmail.com";

export function getAdminNotifyRecipient(): string | null {
  const chain = [
    process.env.REGISTRATION_NOTIFY_EMAIL,
    process.env.EARLY_ACCESS_NOTIFY_EMAIL,
    process.env.HYPERADMIN_ALERT_EMAIL,
    process.env.SEED_HYPER_ADMIN_EMAIL,
  ];
  for (const raw of chain) {
    const trimmed = raw?.trim();
    if (trimmed) return trimmed;
  }
  if (process.env.NODE_ENV === "production") {
    return DEFAULT_PRODUCTION_NOTIFY_EMAIL;
  }
  return null;
}
