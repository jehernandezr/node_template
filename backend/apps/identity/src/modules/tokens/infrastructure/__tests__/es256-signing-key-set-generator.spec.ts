import { SigningKeyState } from '../../domain/signing-key-state.enum.js';
import { ConfigSigningKeyProvider } from '../config-signing-key-provider.js';
import { Es256SigningKeySetGenerator } from '../es256-signing-key-set-generator.js';

describe('Es256SigningKeySetGenerator', () => {
  const generator = new Es256SigningKeySetGenerator();

  it('generates one active P-256 key that identity reads as IDENTITY_SIGNING_KEYS', () => {
    const ring = new ConfigSigningKeyProvider(generator.generate()).ring();

    expect(ring.published()).toHaveLength(1);
    expect(ring.active().state).toBe(SigningKeyState.Active);
    expect(ring.active().publicKey.asymmetricKeyDetails).toEqual({
      namedCurve: 'prime256v1',
    });
  });

  it('gives each key its own kid', () => {
    const kidOf = (text: string): string =>
      (JSON.parse(text) as readonly { readonly kid: string }[])[0]?.kid ?? '';

    expect(kidOf(generator.generate())).not.toBe(kidOf(generator.generate()));
  });
});
