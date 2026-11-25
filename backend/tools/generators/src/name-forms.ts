import { GeneratorError, GeneratorErrorReason } from './generator-error.js';

/** The forms of a kebab-case name that the templates use. */
export class NameForms {
  private static readonly KEBAB = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

  private constructor(
    /** `api-keys`: folders, files, contract ids and `__name__`. */
    readonly kebab: string,
    /** `apiKeys`: variables, `__nameCamel__`. */
    readonly camel: string,
    /** `ApiKeys`: classes and enums, `__Name__`. */
    readonly pascal: string,
    /** `API_KEYS`: constantes, `__NAME__`. */
    readonly upperSnake: string,
    /** `api_keys`: databases, `__name_snake__`. */
    readonly snake: string,
  ) {}

  /** @throws GeneratorError `InvalidName` if the name is not in kebab-case. */
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
