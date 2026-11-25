import { randomFillSync } from 'node:crypto';
import { RandomSource } from './random-source.js';

/**
 * System randomness. `next` uses `Math.random`, enough for jitter and
 * sampling; `bytes` comes from the cryptographic generator for identifiers.
 */
export class SystemRandomSource extends RandomSource {
  next(): number {
    return Math.random();
  }

  bytes(length: number): Uint8Array {
    return randomFillSync(new Uint8Array(length));
  }
}
