import { LruMap } from '../lru-map.js';

/**
 * Última secuencia de invalidación por clave, acotada. Una clave olvidada
 * responde con la secuencia más alta expulsada, así la expulsión solo puede
 * hacer que una carga parezca más vieja de lo que es (y no se cachee), nunca más nueva.
 */
export class InvalidationLog {
  private readonly last: LruMap<string, number>;
  private floor = 0;
  private sequence = 0;

  constructor(maxEntries: number) {
    this.last = new LruMap(maxEntries, (_key, sequence) => {
      this.floor = Math.max(this.floor, sequence);
    });
  }

  /** Secuencia actual: la de la última invalidación registrada en este log. */
  current(): number {
    return this.sequence;
  }

  /** Registra una invalidación de `key` y devuelve su secuencia. */
  mark(key: string): number {
    this.sequence += 1;
    this.last.set(key, this.sequence);
    return this.sequence;
  }

  /** Secuencia de la última invalidación de `key`, o una cota superior si se olvidó. */
  lastFor(key: string): number {
    return this.last.peek(key) ?? this.floor;
  }

  /** `true` cuando no se registró ninguna invalidación de `key` después de `sequence`. */
  isCurrent(key: string, sequence: number): boolean {
    return this.lastFor(key) <= sequence;
  }
}
