/** An email to send with a template. `messageId` makes the send idempotent. */
export interface EmailRequest {
  readonly messageId: string;
  readonly template: string;
  readonly to: string;
  readonly locale: string;
  readonly parameters: ReadonlyMap<string, string>;
}
