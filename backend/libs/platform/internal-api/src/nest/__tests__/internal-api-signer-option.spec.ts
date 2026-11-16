import type { Provider } from '@nestjs/common';
import { FixedClock } from '@platform/kernel/test-utils';
import { RecordingRequestSigner } from '../../__tests__/utils/index.js';
import { HmacSigner } from '../../signing/hmac-signer.js';
import { InternalRequestSigner } from '../../signing/internal-request-signer.js';
import { InternalApiClientProviders } from '../internal-api-client.providers.js';
import type { InternalApiModuleOptions } from '../internal-api-module-options.js';
import { InternalTransportKind } from '../internal-transport-kind.enum.js';

type SignerFactory = (
  options: InternalApiModuleOptions,
  clock: FixedClock,
) => InternalRequestSigner;

describe('InternalRequestSigner provider', () => {
  const clock = new FixedClock(new Date('2026-01-01T00:00:00.000Z'));

  function signerFactory(): SignerFactory {
    const provider = InternalApiClientProviders.build(
      InternalTransportKind.Http,
    ).find(
      (candidate: Provider) =>
        typeof candidate === 'object' &&
        'provide' in candidate &&
        candidate.provide === InternalRequestSigner,
    );
    if (provider === undefined || !('useFactory' in provider)) {
      throw new Error('InternalRequestSigner provider is missing');
    }
    return provider.useFactory as SignerFactory;
  }

  function options(signer?: InternalRequestSigner): InternalApiModuleOptions {
    return {
      operations: [],
      http: {
        baseUrls: {},
        secret: 'secret-of-the-signer-option',
        ...(signer === undefined ? {} : { signer }),
      },
    };
  }

  it('provides the InternalRequestSigner with the HTTP transport', () => {
    const providers = InternalApiClientProviders.build(
      InternalTransportKind.Http,
    );

    expect(providers).toContainEqual(
      expect.objectContaining({ provide: InternalRequestSigner }),
    );
  });

  it('uses the signer given in the HTTP options', () => {
    const signer = new RecordingRequestSigner();

    const created = signerFactory()(options(signer), clock);

    expect(created).toBe(signer);
  });

  it('falls back to HmacSigner without a signer in the HTTP options', () => {
    const created = signerFactory()(options(), clock);

    expect(created).toBeInstanceOf(HmacSigner);
  });
});
