/** Resultado exitoso. */
export interface Ok<T> {
  readonly ok: true;
  readonly value: T;
}

/** Resultado fallido. */
export interface Err<E> {
  readonly ok: false;
  readonly error: E;
}

/** Resultado de una operación que puede fallar sin lanzar. Se discrimina por `ok`. */
export type Result<T, E = Error> = Ok<T> | Err<E>;

/** Crea un resultado exitoso. */
export function ok(): Ok<void>;
export function ok<T>(value: T): Ok<T>;
export function ok<T>(value?: T): Ok<T | undefined> {
  return { ok: true, value };
}

/** Crea un resultado fallido. */
export function err<E>(error: E): Err<E> {
  return { ok: false, error };
}

/** Indica si el resultado es exitoso. */
export function isOk<T, E>(result: Result<T, E>): result is Ok<T> {
  return result.ok;
}

/** Indica si el resultado es fallido. */
export function isErr<T, E>(result: Result<T, E>): result is Err<E> {
  return !result.ok;
}
