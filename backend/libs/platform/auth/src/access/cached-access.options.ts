/** Opciones de `CachedAccessResolver`. */
export interface CachedAccessOptions {
  /** Cuánto vive en memoria un grant leído. */
  readonly ttlMs: number;
  /** Entradas máximas; al pasarse sale la menos usada. */
  readonly maxEntries: number;
}
