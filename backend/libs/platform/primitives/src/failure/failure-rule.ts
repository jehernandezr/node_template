import type { FailureKind } from '@platform/kernel';

/**
 * Regla que un adaptador registra para traducir los errores de su proveedor
 * (Postgres, AWS, Valkey) a una clase de falla.
 */
export abstract class FailureRule {
  /** Clase de la falla que `error` declara, o `undefined` si la regla no dice nada. */
  abstract classify(error: object): FailureKind | undefined;
}
