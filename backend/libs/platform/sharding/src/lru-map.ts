import { ShardingGuard } from './errors/sharding-guard.js';

/**
 * Mapa con un máximo de entradas. Leer con `get` o escribir marca la entrada
 * como recién usada; al llenarse, una escritura expulsa la menos reciente y la
 * informa a `onEvict`.
 */
export class LruMap<K, V> {
  private readonly entries = new Map<K, V>();

  /** @throws ShardingError `InvalidConfiguration` si `maxEntries` no es un entero positivo. */
  constructor(
    readonly maxEntries: number,
    private readonly onEvict?: (key: K, value: V) => void,
  ) {
    ShardingGuard.instance.positiveInteger('maxEntries', maxEntries);
  }

  get size(): number {
    return this.entries.size;
  }

  /** Devuelve el valor y lo marca como recién usado. */
  get(key: K): V | undefined {
    if (!this.entries.has(key)) {
      return undefined;
    }
    const value = this.entries.get(key) as V;
    this.entries.delete(key);
    this.entries.set(key, value);
    return value;
  }

  /** Devuelve el valor sin cambiar su posición. */
  peek(key: K): V | undefined {
    return this.entries.get(key);
  }

  set(key: K, value: V): void {
    this.entries.delete(key);
    this.entries.set(key, value);
    while (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next();
      if (oldest.done === true) {
        return;
      }
      const evicted = this.entries.get(oldest.value) as V;
      this.entries.delete(oldest.value);
      this.onEvict?.(oldest.value, evicted);
    }
  }

  delete(key: K): boolean {
    return this.entries.delete(key);
  }
}
