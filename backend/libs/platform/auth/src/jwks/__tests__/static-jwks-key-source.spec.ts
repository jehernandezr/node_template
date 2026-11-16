import { TestKeyPair } from '../../__tests__/utils/test-key-pair.js';
import { StaticJwksKeySource } from '../static-jwks-key-source.js';

describe('StaticJwksKeySource', () => {
  const pair = TestKeyPair.generate('k1');

  it('returns the key registered under the kid', async () => {
    const source = new StaticJwksKeySource(new Map([['k1', pair.publicKey]]));

    await expect(source.keyFor('k1')).resolves.toBe(pair.publicKey);
  });

  it('returns undefined for an unknown kid', async () => {
    const source = new StaticJwksKeySource(new Map([['k1', pair.publicKey]]));

    await expect(source.keyFor('unknown')).resolves.toBeUndefined();
  });
});
