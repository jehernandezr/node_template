import { Id } from './id.js';

/** Puerto para generar identificadores. */
export interface IdGenerator {
  next(): Id;
}

/** Genera UUIDv7 con la librería `uuid`. */
export class UuidV7IdGenerator implements IdGenerator {
  next(): Id {
    return Id.generate();
  }
}
