import { generateKeyPairSync } from 'node:crypto';
import { SigningKeyRing } from '../signing-key-ring.js';
import { SigningKeyState } from '../signing-key-state.enum.js';
import type { SigningKey } from '../signing-key.js';

function aKey(kid: string, state: SigningKeyState): SigningKey {
  const pair = generateKeyPairSync('ec', { namedCurve: 'P-256' });
  return { kid, privateKey: pair.privateKey, publicKey: pair.publicKey, state };
}

describe('SigningKeyRing', () => {
  it('signs with the active key and publishes the active and verifying ones', () => {
    const ring = new SigningKeyRing([
      aKey('nueva', SigningKeyState.Verifying),
      aKey('actual', SigningKeyState.Active),
      aKey('vieja', SigningKeyState.Retired),
    ]);

    expect(ring.active().kid).toBe('actual');
    expect(ring.published().map((key) => key.kid)).toEqual(['nueva', 'actual']);
    expect(ring.find('vieja')).toBeUndefined();
  });

  it('needs exactly one active key and unique kids', () => {
    expect(
      () => new SigningKeyRing([aKey('a', SigningKeyState.Verifying)]),
    ).toThrow('exactly one active key');
    expect(
      () =>
        new SigningKeyRing([
          aKey('a', SigningKeyState.Active),
          aKey('a', SigningKeyState.Verifying),
        ]),
    ).toThrow('repeats a kid');
  });
});
