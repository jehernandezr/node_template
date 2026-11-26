import type { NameForms } from './name-forms.js';

/** Replaces in a template the forms of a name and, in module templates, the service name. */
export class TemplateRenderer {
  /** Suffix of template files: so neither the compiler nor lint treat them as code. */
  static readonly SUFFIX = '.tpl';

  /**
   * Replaces the name placeholders of a template.
   * @param text Template text.
   * @param name Forms of the generated name.
   * @param service Forms of the service, for module templates.
   * @returns The rendered text.
   */
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

  /**
   * The path of the file produced from a template, without the suffix.
   * @param templatePath Path of the template.
   * @param name Forms of the generated name.
   * @param service Forms of the service, for module templates.
   * @returns The rendered path.
   */
  path(templatePath: string, name: NameForms, service?: NameForms): string {
    return this.render(
      templatePath.slice(0, -TemplateRenderer.SUFFIX.length),
      name,
      service,
    );
  }
}
