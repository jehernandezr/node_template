import { Id } from '../id.js';
import type { IdGenerator } from '../id-generator.js';

/**
 * Generador determinista para tests. Produce UUIDv7 válidos y distintos:
 * el prefijo de tiempo es fijo y un contador ocupa los últimos 48 bits.
 */
export class SequentialIdGenerator implements IdGenerator {
  private counter = 0;
  private readonly timestampHex: string;

  constructor(at: Date = new Date('2025-01-01T00:00:00.000Z')) {
    this.timestampHex = at.getTime().toString(16).padStart(12, '0');
  }

  next(): Id {
    this.counter += 1;
    const seq = this.counter.toString(16).padStart(12, '0');
    const t = this.timestampHex;
    return Id.from(`${t.slice(0, 8)}-${t.slice(8, 12)}-7000-8000-${seq}`);
  }
}
