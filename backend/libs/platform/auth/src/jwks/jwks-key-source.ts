import type { KeyObject } from 'node:crypto';

/** De dónde sale la clave pública que firmó un token, por `kid`. */
export abstract class JwksKeySource {
  /** La clave del `kid`, o `undefined` si el emisor no la publica. */
  abstract keyFor(kid: string): Promise<KeyObject | undefined>;
}
