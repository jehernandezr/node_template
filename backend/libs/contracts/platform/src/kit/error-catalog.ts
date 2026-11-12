import { ValidationRules } from '../constants/validation.constants.js';
import type { ErrorAudience } from '../enums/error-audience.enum.js';
import type { ErrorCatalogEntry } from '../types/error-catalog-entry.type.js';
import { ContractDefinitionError } from './contract-definition-error.js';

/** Formato de un código de error: `SERVICIO.SUBMÓDULO.ERROR`. */
export const ERROR_CODE_PATTERN = /^[A-Z]+(\.[A-Z_]+){2}$/;

/**
 * Clave ARB del mensaje de un código. Es la misma transformación que usa el front:
 * `PLATFORM.AUTH.FORBIDDEN` → `error_platform_auth_forbidden`.
 */
export function messageKeyFor(code: string): string {
  return `${ValidationRules.messageKeyPrefix}${code.toLowerCase().replace(/[.-]/g, '_')}`;
}

/** Datos de una entrada del catálogo; la clave del mensaje se deriva del código. */
export interface ErrorSpec {
  readonly httpStatus: number;
  readonly retryable: boolean;
  readonly audience: ErrorAudience;
  readonly description: string;
}

/**
 * Construye el catálogo de un enum de códigos. El tipo exige una entrada por
 * cada valor del enum, y el orden del resultado sigue el del enum.
 */
export function defineErrorCatalog<E extends Record<string, string>>(
  codes: E,
  specs: { readonly [K in E[keyof E]]: ErrorSpec },
): readonly ErrorCatalogEntry[] {
  const values = Object.values(codes);
  const extra = Object.keys(specs).filter((code) => !values.includes(code));
  if (extra.length > 0) {
    throw new ContractDefinitionError(
      `Códigos del catálogo fuera del enum: ${extra.join(', ')}`,
    );
  }
  return Object.freeze(
    values.map((code) => {
      if (!ERROR_CODE_PATTERN.test(code)) {
        throw new ContractDefinitionError(`Código de error inválido: ${code}`);
      }
      const spec = (specs as Record<string, ErrorSpec | undefined>)[code];
      if (!spec) {
        throw new ContractDefinitionError(`Falta la entrada de ${code}`);
      }
      if (spec.httpStatus < 400 || spec.httpStatus > 599) {
        throw new ContractDefinitionError(
          `Estado HTTP inválido para ${code}: ${spec.httpStatus}`,
        );
      }
      return Object.freeze({ code, ...spec, messageKey: messageKeyFor(code) });
    }),
  );
}

/**
 * Registro en memoria de entradas del catálogo, indexado por código.
 */
export class ErrorCatalog {
  private readonly entries = new Map<string, ErrorCatalogEntry>();

  /**
   * Registra entradas. Valida todas antes de guardar ninguna, así un lote
   * inválido no deja el catálogo a medias.
   */
  register(entries: readonly ErrorCatalogEntry[]): void {
    const batch = new Set<string>();
    for (const entry of entries) {
      if (!ERROR_CODE_PATTERN.test(entry.code)) {
        throw new Error(`Código de error inválido: ${entry.code}`);
      }
      if (this.entries.has(entry.code) || batch.has(entry.code)) {
        throw new Error(`Código de error duplicado: ${entry.code}`);
      }
      batch.add(entry.code);
    }
    for (const entry of entries) {
      this.entries.set(entry.code, entry);
    }
  }

  get(code: string): ErrorCatalogEntry | undefined {
    return this.entries.get(code);
  }

  all(): ErrorCatalogEntry[] {
    return [...this.entries.values()];
  }
}
