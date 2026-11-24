import { ValidationRules } from '../constants/validation.constants.js';
import { ErrorAudience } from '../enums/error-audience.enum.js';
import type { ProblemDetailKey } from '../enums/problem-detail-key.enum.js';
import type { ErrorCatalogEntry } from '../types/error-catalog-entry.type.js';
import { ContractDefinitionError } from './contract-definition-error.js';

/**
 * Formato de un código de error: `SERVICIO.SUBMÓDULO.ERROR`, con al menos tres
 * segmentos. Es la misma expresión que `ErrorCode.PATTERN` del kernel, que un
 * contrato no puede importar; una prueba de `@platform/primitives` comprueba
 * que coinciden.
 */
export const ERROR_CODE_PATTERN = /^[A-Z][A-Z0-9_]*(\.[A-Z][A-Z0-9_]*){2,}$/;

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
  readonly publicDetails?: readonly ProblemDetailKey[];
}

/**
 * Atajos para declarar las entradas de un catálogo: `pub` para los códigos que
 * llegan al cliente y `internal` para los que nunca salen del backend.
 */
export class ErrorSpecs {
  static pub(
    httpStatus: number,
    retryable: boolean,
    description: string,
    publicDetails?: readonly ProblemDetailKey[],
  ): ErrorSpec {
    return {
      httpStatus,
      retryable,
      audience: ErrorAudience.Public,
      description,
      ...(publicDetails !== undefined && { publicDetails }),
    };
  }

  static internal(
    httpStatus: number,
    retryable: boolean,
    description: string,
  ): ErrorSpec {
    return {
      httpStatus,
      retryable,
      audience: ErrorAudience.Internal,
      description,
    };
  }
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
   *
   * Las librerías repiten los códigos públicos del catálogo central para ser
   * autónomas, y el servicio registra el central y el de cada librería que usa.
   * Por eso una entrada repetida es válida si define lo mismo, y solo se
   * rechaza cuando cambia el estado HTTP, el reintento o la audiencia.
   */
  register(entries: readonly ErrorCatalogEntry[]): void {
    const batch = new Map<string, ErrorCatalogEntry>();
    for (const entry of entries) {
      if (!ERROR_CODE_PATTERN.test(entry.code)) {
        throw new Error(`Código de error inválido: ${entry.code}`);
      }
      const stored = this.entries.get(entry.code) ?? batch.get(entry.code);
      if (stored === undefined) {
        batch.set(entry.code, entry);
        continue;
      }
      if (!ErrorCatalog.sameDefinition(stored, entry)) {
        throw new Error(
          `Código de error duplicado con otra definición: ${entry.code}`,
        );
      }
    }
    for (const entry of batch.values()) {
      this.entries.set(entry.code, entry);
    }
  }

  private static sameDefinition(
    stored: ErrorCatalogEntry,
    entry: ErrorCatalogEntry,
  ): boolean {
    return (
      stored.httpStatus === entry.httpStatus &&
      stored.retryable === entry.retryable &&
      stored.audience === entry.audience
    );
  }

  get(code: string): ErrorCatalogEntry | undefined {
    return this.entries.get(code);
  }

  all(): ErrorCatalogEntry[] {
    return [...this.entries.values()];
  }
}
