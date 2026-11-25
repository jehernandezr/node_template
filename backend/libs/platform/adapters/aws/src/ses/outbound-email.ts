/** An email ready to send: sender, one recipient and the body in HTML and in text. */
export interface OutboundEmail {
  readonly from: string;
  readonly to: string;
  readonly subject: string;
  readonly html: string;
  readonly text: string;
}
