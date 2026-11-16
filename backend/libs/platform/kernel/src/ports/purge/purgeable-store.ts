/** Almacén con registros terminados que una tarea de retención borra. */
export abstract class PurgeableStore {
  /** Borra lo terminado antes de `before`. Devuelve cuántos registros eliminó. */
  abstract purgeCompleted(before: Date): Promise<number>;
}
