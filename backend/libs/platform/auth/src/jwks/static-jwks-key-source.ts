import type { KeyObject } from 'node:crypto';
import { JwksKeySource } from './jwks-key-source.js';

/** Fixed in-memory keys. Identity uses them with its own keys; the tests, with a generated pair. */
export class StaticJwksKeySource extends JwksKeySource {
  constructor(private readonly keys: ReadonlyMap<string, KeyObject>) {
    super();
  }

  override async keyFor(kid: string): Promise<KeyObject | undefined> {
    return this.keys.get(kid);
  }
}
