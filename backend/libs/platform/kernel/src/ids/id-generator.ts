import type { Id } from './id.js';

/** Port for generating identifiers. */
export abstract class IdGenerator {
  /**
   * Generates a new UUIDv7.
   * @returns The id.
   */
  abstract next(): Id;
}
