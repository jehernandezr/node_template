/** Hash of an email address: identifies the recipient in the logs without storing the address. */
export abstract class RecipientFingerprint {
  abstract of(address: string): string;
}
