import { TemplateParameter } from '@contracts/notifications';
import { HtmlText } from '../html-text.js';
import type { RenderedEmail } from '../rendered-email.js';
import type { EmailCopy } from './email-copy.js';

/**
 * Plantilla de correo: textos por idioma con datos entre llaves, y un único armado de HTML y texto plano para
 * todas. Los datos se escapan al armar el HTML; nunca llevan marcado propio. Una línea con un dato que no
 * llegó se omite, así un saludo sin nombre no deja la llave a la vista.
 */
export abstract class EmailTemplate {
  static readonly FALLBACK_LOCALE = 'es';
  private static readonly PLACEHOLDER = /\{([a-z_]+)\}/g;

  abstract readonly key: string;
  /** Sube cuando cambian los textos: `email_messages` guarda con qué versión salió cada correo. */
  abstract readonly version: number;
  protected abstract readonly copies: Readonly<Record<string, EmailCopy>>;

  /** `parameters` va por nombre: los de `TemplateParameter` y, en las plantillas propias, los suyos. */
  render(
    parameters: ReadonlyMap<string, string>,
    locale: string,
  ): RenderedEmail {
    const copy = this.copyFor(locale);
    const fill = (text: string, escape: (value: string) => string): string =>
      text.replace(EmailTemplate.PLACEHOLDER, (match, name: string) => {
        const value = parameters.get(name);
        return value === undefined ? match : escape(value);
      });
    const complete = copy.lines.filter((line) =>
      [...line.matchAll(EmailTemplate.PLACEHOLDER)].every(([, name]) =>
        parameters.has(String(name)),
      ),
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
}
