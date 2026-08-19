/**
 * Where support messages go.
 *
 * This project had no support address of any kind before this page
 * existed (no constant, no env var, nothing in the README) — so rather
 * than inventing one, the address is configuration:
 *
 *   SUPPORT_EMAIL="support@yourdomain.com"
 *
 * `getPublicSupportEmail()` is what the support page is allowed to
 * PRINT. It reads SUPPORT_EMAIL only, deliberately never falling back to
 * ADMIN_EMAIL — that one belongs to a person who seeded the admin
 * account, and publishing it on a public page would be a leak, not a
 * feature.
 *
 * `getSupportInboxAddress()` is what the /api/support route DELIVERS to.
 * It may fall back to ADMIN_EMAIL, because an operator who set only that
 * still has a working mailbox and a form that silently drops messages is
 * worse than one that reaches the admin. If neither is set, the route
 * says so honestly instead of pretending the message was sent.
 */

function readEnvEmail(name: string): string | null {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

/** Safe to render publicly. Null when no support address is configured. */
export function getPublicSupportEmail(): string | null {
  return readEnvEmail("SUPPORT_EMAIL");
}

/** Server-side delivery target for the support form. Never rendered to visitors. */
export function getSupportInboxAddress(): string | null {
  return readEnvEmail("SUPPORT_EMAIL") ?? readEnvEmail("ADMIN_EMAIL");
}
