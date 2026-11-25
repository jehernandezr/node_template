/** An email ready for the provider: sender, one recipient and the body in HTML and text. */
export interface OutgoingEmail {
  readonly from: string;
  readonly to: string;
  readonly subject: string;
  readonly html: string;
  readonly text: string;
}
