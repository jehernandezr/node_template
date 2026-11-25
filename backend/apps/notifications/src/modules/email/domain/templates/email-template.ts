import { TemplateParameter } from '@contracts/notifications';
import { TemplateParameterMissingError } from '../email.error.js';
import { HtmlText } from '../html-text.js';
import type { RenderedEmail } from '../rendered-email.js';
import type { EmailCopy } from './email-copy.js';

/**
 * Plantilla de correo: textos por idioma con datos entre llaves, y un único armado de HTML y texto plano para
 * todas. Los datos se escapan al armar el HTML; nunca llevan marcado propio. Un dato obligatorio que no llegó
 * detiene el armado: un correo de MFA sin código no sale. Solo una línea con un dato que la plantilla declara
 * opcional se omite, así un saludo sin nombre no deja la llave a la vista.
 */
export abstract class EmailTemplate {
  static readonly FALLBACK_LOCALE = 'es';
  private static readonly PLACEHOLDER = /\{([a-z_]+)\}/g;
  private static readonly NONE: ReadonlySet<string> = new Set();

  abstract readonly key: string;
  /** Sube cuando cambian los textos: `email_messages` guarda con qué versión salió cada correo. */
  abstract readonly version: number;
  protected abstract readonly copies: Readonly<Record<string, EmailCopy>>;
  /** Datos sin los que el correo igual tiene sentido: su línea se omite. */
  protected readonly optionalParameters: ReadonlySet<string> =
    EmailTemplate.NONE;

  /**
   * `parameters` va por nombre: los de `TemplateParameter` y, en las plantillas propias, los suyos.
   * @throws TemplateParameterMissingError si falta un dato que la plantilla no declara opcional.
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

  /** El idioma pedido, su idioma base (`es` de `es-CO`) o el de respaldo. */
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
