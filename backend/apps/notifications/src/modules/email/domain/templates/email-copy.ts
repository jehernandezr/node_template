/** Texts of an email in a language. `{name}` is replaced by the template value with that name. */
export interface EmailCopy {
  readonly subject: string;
  readonly lines: readonly string[];
  /** Link text, if the email has a `link`. */
  readonly action?: string;
}
