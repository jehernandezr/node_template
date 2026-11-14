import type { Clock } from '@platform/kernel';
import { LruMap } from '../lru-map.js';

interface ExpiringEntry<V> {
  readonly value: V;
  readonly expiresAt: number;
}

/** {@link LruMap} cuyas entradas dejan de existir al llegar su instante de expiración, medido con el `Clock`. */
export class ExpiringLru<V> {
  private readonly entries: LruMap<string, ExpiringEntry<V>>;

  constructor(
    maxEntries: number,
    private readonly clock: Clock,
  ) {
    this.entries = new LruMap(maxEntries);
  }

  /** Valor vigente de la clave, o `undefined` si no existe o expiró (y la borra). */
  get(key: string): V | undefined {
    const entry = this.entries.get(key);
    if (entry === undefined) {
      return undefined;
    }
    if (this.clock.now().getTime() >= entry.expiresAt) {
      this.entries.delete(key);
      return undefined;
    }
    return entry.value;
  }

  /** @param expiresAt Instante epoch en milisegundos desde el cual la entrada ya no vale. */
  set(key: string, value: V, expiresAt: number): void {
    this.entries.set(key, { value, expiresAt });
  }

  delete(key: string): void {
    this.entries.delete(key);
  }
}
