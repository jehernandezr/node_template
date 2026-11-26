import { TemplateParameter } from '@contracts/notifications';
import { TemplateParameterMissingError } from '../email.error.js';
import { HtmlText } from '../html-text.js';
import type { RenderedEmail } from '../rendered-email.js';
import type { EmailCopy } from './email-copy.js';

/**
 * Email template: texts per language with values in braces, and a single HTML and plain text build for
 * all of them. Values are escaped when building the HTML; they never carry their own markup. A required value that did not arrive
 * stops the build: an MFA email without a code does not go out. Only a line with a value the template declares
 * optional is omitted, so a greeting without a name does not leave the brace placeholder visible.
 */
export abstract class EmailTemplate {
  static readonly FALLBACK_LOCALE = 'es';
  private static readonly PLACEHOLDER = /\{([a-z_]+)\}/g;
  private static readonly NONE: ReadonlySet<string> = new Set();

  abstract readonly key: string;
  /** Bumped when the texts change: `email_messages` stores which version each email went out with. */
  abstract readonly version: number;
  protected abstract readonly copies: Readonly<Record<string, EmailCopy>>;
  /** Values without which the email still makes sense: their line is omitted. */
  protected readonly optionalParameters: ReadonlySet<string> =
    EmailTemplate.NONE;

  /**
   * Renders the subject, text and HTML of the email in a locale.
   * `parameters` goes by name: those of `TemplateParameter` and, in custom templates, their own.
   * @param parameters Values by name.
   * @param locale Locale of the recipient.
   * @returns The rendered email.
   * @throws TemplateParameterMissingError if a value the template does not declare optional is missing.
   */
  render(
    parameters: ReadonlyMap<string, string>,
    locale: string,
  ): RenderedEmail {
    const copy = this.copyFor(locale);
    this.assertRequired(copy, parameters);
    const fill = (text: string, escape: (value: string) => string): string =>
      text.replace(EmailTemplate.PLACEHOLDER, (match, name: string) => {
        const value = parameters.get(name);
        return value === undefined ? match : escape(value);
      });
    const complete = copy.lines.filter((line) =>
      EmailTemplate.namesIn(line).every((name) => parameters.has(name)),
    );
    const link = parameters.get(TemplateParameter.Link);
    const lines = complete.map((line) => fill(line, (value) => value));
    const htmlLines = complete.map(
      (line) => `<p>${fill(HtmlText.escape(line), HtmlText.escape)}</p>`,
    );
    const action =
      link === undefined || copy.action === undefined
        ? undefined
        : { label: copy.action, url: link };
    return {
      subject: fill(copy.subject, (value) => value),
      text: [
        ...lines,
        ...(action === undefined ? [] : [`${action.label}: ${action.url}`]),
      ].join('\n\n'),
      html: [
        ...htmlLines,
        ...(action === undefined
          ? []
          : [
              `<p><a href="${HtmlText.escape(action.url)}">${HtmlText.escape(action.label)}</a></p>`,
            ]),
      ].join('\n'),
    };
  }

  private assertRequired(
    copy: EmailCopy,
    parameters: ReadonlyMap<string, string>,
  ): void {
    const missing = [copy.subject, ...copy.lines]
      .flatMap((text) => EmailTemplate.namesIn(text))
      .find(
        (name) => !parameters.has(name) && !this.optionalParameters.has(name),
      );
    if (missing !== undefined) {
      throw new TemplateParameterMissingError(this.key, missing);
    }
  }

  /** The requested language, its base language (`es` from `es-CO`) or the fallback one. */
  private copyFor(locale: string): EmailCopy {
    const base = locale.split('-')[0] ?? locale;
    const copy =
      this.copies[locale] ??
      this.copies[base] ??
      this.copies[EmailTemplate.FALLBACK_LOCALE];
    if (copy === undefined) {
      throw new Error(
        `Template ${this.key} has no ${EmailTemplate.FALLBACK_LOCALE} copy`,
      );
    }
    return copy;
  }

  private static namesIn(text: string): string[] {
    return [...text.matchAll(EmailTemplate.PLACEHOLDER)].map(([, name]) =>
      String(name),
    );
  }
}
