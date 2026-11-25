/** Stable hash of a normalized email: the catalog stores the hash, never the email. */
export abstract class EmailFingerprinter {
  abstract fingerprint(normalizedEmail: string): Buffer;
}
