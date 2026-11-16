import { TestKeyPair } from './utils/test-key-pair.js';

describe('TestKeyPair', () => {
  it('generates a different key on every call', () => {
    const first = TestKeyPair.generate('k1');
    const second = TestKeyPair.generate('k1');

    expect(first.jwk().x).not.toBe(second.jwk().x);
  });

  it('resolves only its own kid from its key source', async () => {
    const pair = TestKeyPair.generate('k1');
    const source = pair.keySource();

    await expect(source.keyFor('k1')).resolves.toBe(pair.publicKey);
    await expect(source.keyFor('k2')).resolves.toBeUndefined();
  });

  it('publishes its kid in the JWK', () => {
    expect(TestKeyPair.generate('k7').jwk().kid).toBe('k7');
  });
});
