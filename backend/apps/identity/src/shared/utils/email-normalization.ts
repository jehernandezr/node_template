/**
 * Canonical form of an email to look it up and store it: trimmed, in NFKC and lowercase.
 * The two forms that come from the client (with and without uppercase) give the same account.
 */
export function normalizeEmail(email: string): string {
  return email.trim().normalize('NFKC').toLowerCase();
}
