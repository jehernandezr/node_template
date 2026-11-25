import { GeneratorError, GeneratorErrorReason } from './generator-error.js';
import type { NameForms } from './name-forms.js';

/**
 * The shared file lines the service generator asks to add by hand and without which the service
 * does not compile or pass lint: its contract alias and the boundaries rule of its `scope`.
 */
export class SharedFileEdits {
  /** The list of services that share the same boundaries rule in `eslint.config.mjs`. */
  private static readonly SERVICE_SCOPES = /\.\.\.\[([^\]]*)\]\.map\(/;

  /** `tsconfig.base.json` with the `@contracts/<service>` alias. */
  static withContractAlias(tsconfig: string, service: NameForms): string {
    const config = JSON.parse(tsconfig) as {
      compilerOptions?: { paths?: Record<string, string[]> };
    };
    const compilerOptions = config.compilerOptions ?? {};
    compilerOptions.paths = {
      ...compilerOptions.paths,
      [`@contracts/${service.kebab}`]: [
        `./libs/contracts/${service.kebab}/src/index.ts`,
      ],
    };
    return `${JSON.stringify({ ...config, compilerOptions }, null, 2)}\n`;
  }

  /**
   * `eslint.config.mjs` with the service in the list of those that follow the service boundaries rule.
   * @throws GeneratorError `MissingMarker` if the list is missing.
   */
  static withServiceScope(eslintConfig: string, service: NameForms): string {
    const match = SharedFileEdits.SERVICE_SCOPES.exec(eslintConfig);
    if (match === null) {
      throw new GeneratorError(
        GeneratorErrorReason.MissingMarker,
        'eslint.config.mjs no tiene la lista de servicios de la regla de límites',
      );
    }
    const services = (match[1] ?? '').trim().replace(/,\s*$/, '');
    const extended = `...[${services}, '${service.kebab}'].map(`;
    return eslintConfig.replace(SharedFileEdits.SERVICE_SCOPES, extended);
  }
}
