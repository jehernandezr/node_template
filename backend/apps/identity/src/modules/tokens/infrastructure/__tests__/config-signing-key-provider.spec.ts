import { generateKeyPairSync } from 'node:crypto';
import { SigningKeyState } from '../../domain/signing-key-state.enum.js';
import { ConfigSigningKeyProvider } from '../config-signing-key-provider.js';
import { SigningKeyJwksSource } from '../signing-key-jwks-source.js';

function privateJwk(
  kid: string,
  status?: SigningKeyState,
): Record<string, unknown> {
  const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
  return {
    ...privateKey.export({ format: 'jwk' }),
    kid,
    ...(status ? { status } : {}),
  };
}

describe('ConfigSigningKeyProvider', () => {
  it('makes the first key active and the rest verifying when no status is given', () => {
    const provider = new ConfigSigningKeyProvider(
      JSON.stringify([privateJwk('k-1'), privateJwk('k-2')]),
    );

    expect(provider.ring().active().kid).toBe('k-1');
    expect(provider.ring().find('k-2')?.state).toBe(SigningKeyState.Verifying);
  });

  it('honours an explicit status, such as a retired key', () => {
    const provider = new ConfigSigningKeyProvider(
      JSON.stringify([
        privateJwk('k-1', SigningKeyState.Retired),
        privateJwk('k-2', SigningKeyState.Active),
      ]),
    );

    expect(provider.ring().active().kid).toBe('k-2');
    expect(
      provider
        .ring()
        .published()
        .map((key) => key.kid),
    ).toEqual(['k-2']);
  });

  it('rejects keys that are not private P-256 JWK', () => {
    expect(
      () => new ConfigSigningKeyProvider(JSON.stringify([{ kty: 'RSA' }])),
    ).toThrow();
  });

  it('gives identity its own public keys to verify tokens', async () => {
    const source = new SigningKeyJwksSource(
      new ConfigSigningKeyProvider(JSON.stringify([privateJwk('k-1')])),
    );

    await expect(source.keyFor('k-1')).resolves.toBeDefined();
    await expect(source.keyFor('other')).resolves.toBeUndefined();
  });
});
