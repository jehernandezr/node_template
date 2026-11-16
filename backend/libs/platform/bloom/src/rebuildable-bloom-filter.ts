import { AsyncBloomFilter } from './async-bloom-filter.js';
import type { BloomRebuildSource } from './bloom-rebuild-source.js';

/** Filtro que el job programado puede reconstruir desde la fuente de verdad. */
export abstract class RebuildableBloomFilter extends AsyncBloomFilter {
  /**
   * Construye un filtro nuevo desde `source` y lo intercambia de una vez. Los lectores conservan el filtro
   * viejo hasta el intercambio, así nunca ven uno a medio construir. Si `source` falla, el viejo se queda y
   * el error sale hacia arriba.
   */
  abstract rebuild(source: BloomRebuildSource): Promise<void>;

  /**
   * Indica si un filtro se puede reconstruir. No usa `instanceof`: los adaptadores lo implementan
   * con `implements`, así que la forma del objeto es la que cuenta.
   */
  static is(filter: AsyncBloomFilter): filter is RebuildableBloomFilter {
    return (
      typeof (filter as Partial<RebuildableBloomFilter>).rebuild === 'function'
    );
  }
}
