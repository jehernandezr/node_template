import { CanonicalJson } from '@platform/primitives';

/** Llave de idempotencia de `(consumidor, id del mensaje)`. */
export class ProcessedMessageKey {
  /** Arreglo JSON canónico: ningún separador puede colisionar. */
  static of(consumer: string, id: string): string {
    return CanonicalJson.stringify([consumer, id]);
  }
}
