/** Subject and bodies of an email already built with its data. */
export interface RenderedEmail {
  readonly subject: string;
  readonly html: string;
  readonly text: string;
}
