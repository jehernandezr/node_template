import { NodeSha256 } from '../node-sha256.js';

/** Digiere `data` con `hasher` y devuelve el resultado en hexadecimal. */
async function hexOf(hasher: NodeSha256): Promise<string> {
  return Buffer.from(await hasher.digest()).toString('hex');
}

describe('NodeSha256', () => {
  it('computes the SHA-256 of a string', async () => {
    const hasher = new NodeSha256();
    hasher.update('abc');

    await expect(hexOf(hasher)).resolves.toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });

  it('computes the HMAC-SHA-256 when given a secret', async () => {
    const hasher = new NodeSha256('key');
    hasher.update('The quick brown fox jumps over the lazy dog');

    await expect(hexOf(hasher)).resolves.toBe(
      'f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8',
    );
  });

  it('accepts a Uint8Array as input', async () => {
    const hasher = new NodeSha256();
    hasher.update(new TextEncoder().encode('abc'));

    await expect(hexOf(hasher)).resolves.toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });

  it('digests only the new data after reset', async () => {
    const hasher = new NodeSha256();
    hasher.update('discarded');
    hasher.reset();
    hasher.update('abc');

    await expect(hexOf(hasher)).resolves.toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });

  it('equals a single update when the input comes in two parts', async () => {
    const split = new NodeSha256();
    split.update('a');
    split.update('bc');
    const whole = new NodeSha256();
    whole.update('abc');

    await expect(hexOf(split)).resolves.toBe(await hexOf(whole));
  });
});
