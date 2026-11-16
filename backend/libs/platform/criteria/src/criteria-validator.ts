import { Pagination } from '@contracts/platform';
import { CriteriaError } from './errors/criteria-error.js';
import { CriteriaErrorCode } from './errors/criteria-error-code.enum.js';

/** Validaciones de entrada de `Criteria` y del traductor. Los mensajes nunca incluyen el valor recibido. */
export class CriteriaValidator {
  /** Tamaño de página máximo: el `Pagination.maxLimit` del contrato. */
  static readonly MAX_LIMIT: number = Pagination.maxLimit;

  private static readonly IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

  /** Construye un error `InvalidValue`. Quien llama decide si lo lanza. */
  static invalid(message: string): CriteriaError {
    return new CriteriaError(CriteriaErrorCode.InvalidValue, message);
  }

  /** @throws CriteriaError `InvalidLimit` salvo que `limit` sea un entero entre 1 y `MAX_LIMIT`. */
  static limit(limit: number): void {
    if (
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > CriteriaValidator.MAX_LIMIT
    ) {
      throw new CriteriaError(
        CriteriaErrorCode.InvalidLimit,
        `limit must be an integer between 1 and ${CriteriaValidator.MAX_LIMIT}`,
      );
    }
  }

  /** @throws CriteriaError `InvalidValue` salvo que `name` sea un identificador SQL simple. */
  static identifier(name: string, what: string): void {
    if (typeof name !== 'string' || !CriteriaValidator.IDENTIFIER.test(name)) {
      throw CriteriaValidator.invalid(
        `${what} must match ^[A-Za-z_][A-Za-z0-9_]*$`,
      );
    }
  }

  /** @throws CriteriaError `InvalidValue` si `value` es `undefined`. */
  static defined(value: unknown, what: string): void {
    if (value === undefined) {
      throw CriteriaValidator.invalid(`${what} must not be undefined`);
    }
  }

  /** @throws CriteriaError `InvalidValue` si `value` es `null` o `undefined`. */
  static present(value: unknown, what: string): void {
    if (value === undefined || value === null) {
      throw CriteriaValidator.invalid(`${what} must not be null or undefined`);
    }
  }

  /** @throws CriteriaError `InvalidValue` salvo que `value` sea una cadena. */
  static text(value: unknown, what: string): asserts value is string {
    if (typeof value !== 'string') {
      throw CriteriaValidator.invalid(`${what} must be a string`);
    }
  }

  /** Copia congelada de la lista. @throws CriteriaError `InvalidValue` si no es un arreglo o tiene `null` o `undefined`. */
  static list(value: unknown): readonly unknown[] {
    if (!Array.isArray(value)) {
      throw CriteriaValidator.invalid('expected an array of values');
    }
    for (const item of value) {
      CriteriaValidator.present(item, 'list item');
    }
    return Object.freeze([...value]);
  }
}
