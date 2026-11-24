import type { NameForms } from './name-forms.js';

/** Sustituye en una plantilla las formas de un nombre y, en las de módulo, el nombre del servicio. */
export class TemplateRenderer {
  /** Sufijo de los archivos de plantilla: así ni el compilador ni el lint los toman como código. */
  static readonly SUFFIX = '.tpl';

  render(text: string, name: NameForms, service?: NameForms): string {
    const pairs: readonly (readonly [string, string])[] = [
      ['__service__', service?.kebab ?? '__service__'],
      ['__nameCamel__', name.camel],
      ['__name_snake__', name.snake],
      ['__NAME__', name.upperSnake],
      ['__Name__', name.pascal],
      ['__name__', name.kebab],
    ];
    return pairs.reduce(
      (result, [placeholder, value]) => result.replaceAll(placeholder, value),
      text,
    );
  }

  /** La ruta del archivo que sale de una plantilla, sin el sufijo. */
  path(templatePath: string, name: NameForms, service?: NameForms): string {
    return this.render(
      templatePath.slice(0, -TemplateRenderer.SUFFIX.length),
      name,
      service,
    );
  }
}
