/** Una entrada con el instante en que se leyó. */
export interface TtlEntry<V> {
  readonly value: V;
  readonly storedAtMs: number;
}

/**
 * Caché en memoria acotada: sale la entrada menos usada al pasarse de
 * `maxEntries`. No borra lo vencido: quien lee decide si una entrada vencida
 * sirve, por ejemplo cuando Valkey no responde.
 */
export class TtlLruCache<V> {
  private readonly entries = new Map<string, TtlEntry<V>>();

  constructor(private readonly maxEntries: number) {}

  /** La entrada, vencida o no, y la marca como la más reciente. */
  get(key: string): TtlEntry<V> | undefined {
    const entry = this.entries.get(key);
    if (entry === undefined) {
      return undefined;
    }
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry;
  }

  set(key: string, value: V, nowMs: number): void {
    this.entries.delete(key);
    this.entries.set(key, { value, storedAtMs: nowMs });
    while (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next().value;
      if (oldest === undefined) {
        return;
      }
      this.entries.delete(oldest);
    }
  }

  /** `true` si la entrada se guardó hace menos de `ttlMs`. */
  isFresh(entry: TtlEntry<V>, nowMs: number, ttlMs: number): boolean {
    return nowMs - entry.storedAtMs < ttlMs;
  }
}
