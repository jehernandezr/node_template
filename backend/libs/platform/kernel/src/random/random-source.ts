/**
 * Fuente de aleatoriedad. Inyectarla vuelve deterministas las esperas con
 * jitter, el muestreo y la generación de identificadores en las pruebas.
 */
export abstract class RandomSource {
  /** Valor uniforme en `[0, 1)`. */
  abstract next(): number;

  /** `length` bytes aleatorios. */
  abstract bytes(length: number): Uint8Array;
}
