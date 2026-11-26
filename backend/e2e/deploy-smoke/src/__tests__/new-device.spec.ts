import { createPublicKey } from 'node:crypto';
import { NewDevice } from '../new-device.js';

describe('NewDevice', () => {
  it('holds a P-256 public key as base64url SPKI DER', () => {
    const key = createPublicKey({
      key: Buffer.from(new NewDevice().publicKey, 'base64url'),
      format: 'der',
      type: 'spki',
    });

    expect(key.asymmetricKeyDetails?.namedCurve).toBe('prime256v1');
  });

  it('is a different key each time', () => {
    expect(new NewDevice().publicKey).not.toBe(new NewDevice().publicKey);
  });
});
