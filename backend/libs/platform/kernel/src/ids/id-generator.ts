import type { Id } from './id.js';

/** Port for generating identifiers. */
export abstract class IdGenerator {
  abstract next(): Id;
}
