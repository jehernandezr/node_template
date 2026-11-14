/** Puerto de filtros de Bloom para backends remotos (por ejemplo, Valkey). */
export abstract class AsyncBloomFilter {
  /** Inserta un ítem. */
  abstract add(item: string): Promise<void>;
  /** Inserta varios ítems. */
  abstract addMany(items: readonly string[]): Promise<void>;
  /** Resuelve false cuando el ítem seguro que no está; true cuando puede estar. */
  abstract mightContain(item: string): Promise<boolean>;
}
