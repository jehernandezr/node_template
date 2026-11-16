import { CanonicalJson, NonJsonValueError } from '@platform/primitives';
import { SagaError } from '../errors/saga-error.js';
import { SagaErrorCode } from '../errors/saga-error-code.enum.js';

/** Reglas sobre los valores que la saga guarda: estado, entrada y salida de pasos. */
export class SagaPayload {
  /**
   * Rechaza lo que no sobrevive a JSON con su forma intacta, con las reglas de
   * `CanonicalJson`: funciones, símbolos, bigints, números no finitos, ciclos,
   * `undefined` dentro de arreglos y todo objeto que no sea simple (Map, Set,
   * Date, instancias de clase). Un `undefined` de primer nivel se acepta.
   * @throws SagaError `InvalidState`
   */
  static assertSerializable(value: unknown): void {
    if (value === undefined) {
      return;
    }
    try {
      CanonicalJson.canonicalize(value);
    } catch (error) {
      if (error instanceof NonJsonValueError) {
        throw new SagaError(
          SagaErrorCode.InvalidState,
          `Saga state is not JSON: ${error.message}`,
          { details: error.details },
        );
      }
      throw error;
    }
  }

  /** Copia profunda por JSON, la única representación que sobrevive al almacén. */
  static clone<T>(value: T): T {
    if (value === undefined) {
      return value;
    }
    const text = JSON.stringify(value);
    return text === undefined ? (undefined as T) : (JSON.parse(text) as T);
  }

  /** Huella estable del valor, para comparar estados iniciales. */
  static digest(value: unknown): string {
    return CanonicalJson.digest(value ?? null);
  }
}
