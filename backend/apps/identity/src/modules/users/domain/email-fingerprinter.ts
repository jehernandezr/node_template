/** Stable hash of a normalized email: the catalog stores the hash, never the email. */
export abstract class EmailFingerprinter {
  /**
   * Derives the keyed fingerprint of a normalized email, used by the catalog index.
   * @param normalizedEmail Lowercase email.
   * @returns The fingerprint.
   */
  abstract fingerprint(normalizedEmail: string): Buffer;
}
