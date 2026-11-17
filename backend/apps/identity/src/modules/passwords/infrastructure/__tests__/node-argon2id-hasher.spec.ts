import { NodeArgon2idHasher } from '../node-argon2id-hasher.js';

describe('NodeArgon2idHasher', () => {
  const hasher = new NodeArgon2idHasher();

  it('hashes in PHC format with the OWASP parameters and verifies it', async () => {
    const hash = await hasher.hash('una frase larga de prueba');

    expect(hash).toMatch(
      /^\$argon2id\$v=19\$m=19456,t=2,p=1\$[A-Za-z0-9+/]+\$[A-Za-z0-9+/]+$/,
    );
    await expect(
      hasher.verify('una frase larga de prueba', hash),
    ).resolves.toBe(true);
    await expect(hasher.verify('otra frase distinta', hash)).resolves.toBe(
      false,
    );
    expect(hasher.needsRehash(hash)).toBe(false);
  });

  it('asks to rehash older parameters and never matches a malformed hash', async () => {
    expect(
      hasher.needsRehash('$argon2id$v=19$m=4096,t=3,p=1$c2FsdA$aGFzaA'),
    ).toBe(true);
    expect(hasher.needsRehash('no es un hash')).toBe(true);
    await expect(hasher.verify('lo que sea', 'no es un hash')).resolves.toBe(
      false,
    );
  });
});
