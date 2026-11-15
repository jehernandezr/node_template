import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { Transport } from '../../transport/transport.js';
import { InProcessTransport } from '../../transport/in-process-transport.js';
import { HttpTransport } from '../../transport/http-transport.js';
import { InternalClient } from '../../client/internal-client.js';
import { ContractRegistry } from '../../contract/contract-registry.js';
import { InternalApiErrorCode } from '../../errors/internal-api-error-code.enum.js';
import { InMemoryProcessedOperationStore } from '../../__tests__/utils/index.js';
import { InternalRouter } from '../../server/internal-router.js';
import { InternalApiModule } from '../internal-api.module.js';
import { InternalTransportKind } from '../internal-transport-kind.enum.js';
import { PublishedContracts } from '../published-contracts.js';
import { InternalApiPlatformTestingModule } from './utils/index.js';

const HTTP_OPTIONS = {
  baseUrls: { billing: 'http://127.0.0.1:9' },
  secret: 'test-secret-of-the-internal-api',
};

describe('InternalApiModule wiring', () => {
  it('resolves the in-process graph with the router, the client and both catalogues', async () => {
    const ref = await Test.createTestingModule({
      imports: [
        InternalApiPlatformTestingModule,
        InternalApiModule.forRoot({
          transport: InternalTransportKind.InProcess,
          processedStore: InMemoryProcessedOperationStore,
          operations: [],
        }),
      ],
    }).compile();

    expect(ref.get(Transport)).toBeInstanceOf(InProcessTransport);
    expect(ref.get(InternalRouter)).toBeInstanceOf(InternalRouter);
    expect(ref.get(InternalClient)).toBeInstanceOf(InternalClient);
    expect(ref.get(ContractRegistry)).not.toBe(ref.get(PublishedContracts));
  });

  it('uses the HTTP transport when the service asks for it', async () => {
    const ref = await Test.createTestingModule({
      imports: [
        InternalApiPlatformTestingModule,
        InternalApiModule.forRoot({
          transport: InternalTransportKind.Http,
          processedStore: InMemoryProcessedOperationStore,
          operations: [],
          http: HTTP_OPTIONS,
        }),
      ],
    }).compile();

    expect(ref.get(Transport)).toBeInstanceOf(HttpTransport);
  });

  it('refuses to compose the module without a transport or a store', () => {
    expect(() =>
      InternalApiModule.forRoot({
        operations: [],
        processedStore: InMemoryProcessedOperationStore,
      }),
    ).toThrow(
      expect.objectContaining({
        code: InternalApiErrorCode.InvalidConfiguration,
      }),
    );
  });

  it('fails to start the HTTP transport without the http options', async () => {
    await expect(
      Test.createTestingModule({
        imports: [
          InternalApiPlatformTestingModule,
          InternalApiModule.forRoot({
            transport: InternalTransportKind.Http,
            processedStore: InMemoryProcessedOperationStore,
            operations: [],
          }),
        ],
      }).compile(),
    ).rejects.toMatchObject({
      code: InternalApiErrorCode.InvalidConfiguration,
    });
  });
});
