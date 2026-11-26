import type { KeyObject } from 'node:crypto';

/** Where the public key that signed a token comes from, by `kid`. */
export abstract class JwksKeySource {
  /**
   * Returns the key of the `kid`, or `undefined` if the issuer does not publish it.
   * @param kid Key id of the token.
   * @returns The key, or `undefined`.
   */
  abstract keyFor(kid: string): Promise<KeyObject | undefined>;
}
