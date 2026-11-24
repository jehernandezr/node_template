import { GeneratorError, GeneratorErrorReason } from './generator-error.js';

/** Las formas de un nombre en kebab-case que usan las plantillas. */
export class NameForms {
  private static readonly KEBAB = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

  private constructor(
    /** `api-keys`: carpetas, archivos, ids de contrato y `__name__`. */
    readonly kebab: string,
    /** `apiKeys`: variables, `__nameCamel__`. */
    readonly camel: string,
    /** `ApiKeys`: clases y enums, `__Name__`. */
    readonly pascal: string,
    /** `API_KEYS`: constantes, `__NAME__`. */
    readonly upperSnake: string,
    /** `api_keys`: bases de datos, `__name_snake__`. */
    readonly snake: string,
  ) {}

  /** @throws GeneratorError `InvalidName` si el nombre no está en kebab-case. */
  static of(name: string): NameForms {
    if (!NameForms.KEBAB.test(name)) {
      throw new GeneratorError(
        GeneratorErrorReason.InvalidName,
        `"${name}" no es un nombre en kebab-case (por ejemplo inventory o api-keys)`,
      );
    }
    const words = name.split('-');
    const capitalized = words.map(
      (word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`,
    );
    return new NameForms(
      name,
      `${words[0] ?? ''}${capitalized.slice(1).join('')}`,
      capitalized.join(''),
      words.join('_').toUpperCase(),
      words.join('_'),
    );
  }
}
