/** Hash of an email address: identifies the recipient in the logs without storing the address. */
export abstract class RecipientFingerprint {
  /**
   * Derives a keyed hash of an address, to look up suppressions without storing the address.
   * @param address Email address.
   * @returns The fingerprint.
   */
  abstract of(address: string): string;
}
