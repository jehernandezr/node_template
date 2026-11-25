import { Id } from '../../ids/id.js';
import type { IdGenerator } from '../../ids/id-generator.js';

/**
 * Deterministic generator for tests. It produces valid, distinct UUIDv7s:
 * the time prefix is fixed and a counter fills the last 48 bits.
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
