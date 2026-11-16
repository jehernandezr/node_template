import type { KeyObject } from 'node:crypto';
import { JwksKeySource } from './jwks-key-source.js';

/** Claves fijas en memoria. Identity las usa con sus propias claves; las pruebas, con un par generado. */
export class StaticJwksKeySource extends JwksKeySource {
  constructor(private readonly keys: ReadonlyMap<string, KeyObject>) {
    super();
  }

  async keyFor(kid: string): Promise<KeyObject | undefined> {
    return this.keys.get(kid);
  }
}
