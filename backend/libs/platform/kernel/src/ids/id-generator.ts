import type { Id } from './id.js';

/** Puerto para generar identificadores. */
export abstract class IdGenerator {
  abstract next(): Id;
}
