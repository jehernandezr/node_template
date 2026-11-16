import { HmacSigner, InternalApiSignerKind } from '@platform/internal-api';
import { FixedClock } from '@platform/kernel/test-utils';
import { SigV4Signer } from '../sigv4-signer.js';
import { SigV4Service } from '../sigv4-service.enum.js';
import { InternalRequestSignerSelector } from '../internal-request-signer-selector.js';
import { StaticCredentialsProvider } from '../../__tests__/utils/index.js';

describe('InternalRequestSignerSelector', () => {
  const dependencies = {
    hmacSecret: 'selector-secret',
    clock: new FixedClock(new Date('2026-01-01T00:00:00.000Z')),
    credentials: new StaticCredentialsProvider({
      accessKeyId: 'test-access-key-id',
      secretAccessKey: 'test-secret-access-key',
    }),
    sigv4: { region: 'us-east-1', service: SigV4Service.ExecuteApi },
  };

  it('selects the HMAC signer', () => {
    const signer = new InternalRequestSignerSelector().select(
      InternalApiSignerKind.Hmac,
      dependencies,
    );

    expect(signer).toBeInstanceOf(HmacSigner);
  });

  it('selects the SigV4 signer', () => {
    const signer = new InternalRequestSignerSelector().select(
      InternalApiSignerKind.SigV4,
      dependencies,
    );

    expect(signer).toBeInstanceOf(SigV4Signer);
  });
});
