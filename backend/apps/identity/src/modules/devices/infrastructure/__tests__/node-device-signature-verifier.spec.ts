import { IdentityErrorCode } from '@contracts/identity';
import { generateKeyPairSync, sign } from 'node:crypto';
import { NodeDeviceSignatureVerifier } from '../node-device-signature-verifier.js';

describe('NodeDeviceSignatureVerifier', () => {
  const verifier = new NodeDeviceSignatureVerifier();
  const pair = generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const publicKey = pair.publicKey
    .export({ format: 'der', type: 'spki' })
    .toString('base64url');

  it.each(['ieee-p1363', 'der'] as const)(
    'verifies an ES256 signature in %s',
    (encoding) => {
      const signature = sign('sha256', Buffer.from('message'), {
        key: pair.privateKey,
        dsaEncoding: encoding,
      }).toString('base64url');

      expect(verifier.verify(publicKey, 'message', signature)).toBe(true);
      expect(verifier.verify(publicKey, 'another message', signature)).toBe(
        false,
      );
    },
  );

  it('rejects keys that are not P-256 and malformed signatures', () => {
    const other = generateKeyPairSync('ec', { namedCurve: 'secp384r1' });
    const p384 = other.publicKey
      .export({ format: 'der', type: 'spki' })
      .toString('base64url');

    expect(() => verifier.assertValidKey(p384)).toThrow(
      expect.objectContaining({ code: IdentityErrorCode.DeviceKeyInvalid }),
    );
    expect(() => verifier.assertValidKey(publicKey)).not.toThrow();
    expect(verifier.verify(publicKey, 'message', 'AAAA')).toBe(false);
    expect(verifier.verify('not-a-key', 'message', 'AAAA')).toBe(false);
  });
});
