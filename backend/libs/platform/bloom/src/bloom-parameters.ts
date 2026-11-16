/** Tamaño del arreglo de bits y número de funciones de hash de un filtro. */
export interface BloomParameters {
  readonly bits: number;
  readonly hashes: number;
}
