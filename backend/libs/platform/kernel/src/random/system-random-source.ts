import { randomFillSync } from 'node:crypto';
import { RandomSource } from './random-source.js';

/**
 * Aleatoriedad del sistema. `next` usa `Math.random`, suficiente para jitter y
 * muestreo; `bytes` sale del generador criptográfico para identificadores.
 */
export class SystemRandomSource extends RandomSource {
  next(): number {
    return Math.random();
  }

  bytes(length: number): Uint8Array {
    return randomFillSync(new Uint8Array(length));
  }
}
