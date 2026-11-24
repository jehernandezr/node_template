import { GeneratorError, GeneratorErrorReason } from './generator-error.js';
import type { NameForms } from './name-forms.js';

/**
 * Las líneas de archivos compartidos que el generador de servicios pide agregar a mano y sin las cuales el servicio
 * no compila ni pasa el lint: el alias de su contrato y la regla de límites de su `scope`.
 */
export class SharedFileEdits {
  /** La lista de servicios que comparten la misma regla de límites en `eslint.config.mjs`. */
  private static readonly SERVICE_SCOPES = /\.\.\.\[([^\]]*)\]\.map\(/;

  /** `tsconfig.base.json` con el alias `@contracts/<servicio>`. */
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
   * `eslint.config.mjs` con el servicio en la lista de los que siguen la regla de límites de los servicios.
   * @throws GeneratorError `MissingMarker` si la lista no está.
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
