import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { Clock } from '@platform/kernel';
import { CallOutcome } from '@platform/primitives';
import { InternalApiErrorCode } from '../../errors/internal-api-error-code.enum.js';
import { InMemoryProcessedOperationStore } from '../../__tests__/utils/index.js';
import { InternalRouter } from '../../server/internal-router.js';
import { InternalApiModule } from '../internal-api.module.js';
import { InternalTransportKind } from '../internal-transport-kind.enum.js';
import { DecoratedHandlers } from './utils/decorated-handlers.js';
import { DuplicateHandlers } from './utils/duplicate-handlers.js';
import { ExplorerOperations } from './utils/explorer-operations.js';
import { InternalApiPlatformTestingModule } from './utils/index.js';

describe('InternalHandlerExplorer', () => {
  it('init, decorated methods, registers them without a manual register', async () => {
    const ref = await Test.createTestingModule({
      imports: [
        InternalApiPlatformTestingModule,
        InternalApiModule.forRoot({
          transport: InternalTransportKind.InProcess,
          processedStore: InMemoryProcessedOperationStore,
          operations: [ExplorerOperations.Count, ExplorerOperations.Echo],
        }),
      ],
      providers: [DecoratedHandlers],
    }).compile();
    await ref.init();

    const outcome = await ref.get(InternalRouter).handle(
      ExplorerOperations.Count.id,
      { sku: 'A' },
      {
        idempotencyKey: 'k',
        timeoutMs: 1000,
        deadline: ref.get(Clock).now().getTime() + 1000,
      },
    );

    expect(outcome).toEqual(CallOutcome.success({ total: 3 }));
    expect(ref.get(DecoratedHandlers).countCalls).toBe(1);
    await ref.close();
  });

  it('init, operation without handler, rejects with MissingHandler', async () => {
    const ref = await Test.createTestingModule({
      imports: [
        InternalApiPlatformTestingModule,
        InternalApiModule.forRoot({
          transport: InternalTransportKind.InProcess,
          processedStore: InMemoryProcessedOperationStore,
          operations: [ExplorerOperations.Count],
        }),
      ],
    }).compile();

    await expect(ref.init()).rejects.toMatchObject({
      code: InternalApiErrorCode.MissingHandler,
    });
  });

  it('init, two methods for one operation, rejects with DuplicateOperation', async () => {
    const ref = await Test.createTestingModule({
      imports: [
        InternalApiPlatformTestingModule,
        InternalApiModule.forRoot({
          transport: InternalTransportKind.InProcess,
          processedStore: InMemoryProcessedOperationStore,
          operations: [ExplorerOperations.Count],
        }),
      ],
      providers: [DuplicateHandlers],
    }).compile();

    await expect(ref.init()).rejects.toMatchObject({
      code: InternalApiErrorCode.DuplicateOperation,
    });
  });

  it('init, remote operation without handler, resolves', async () => {
    const ref = await Test.createTestingModule({
      imports: [
        InternalApiPlatformTestingModule,
        InternalApiModule.forRoot({
          transport: InternalTransportKind.InProcess,
          processedStore: InMemoryProcessedOperationStore,
          operations: [],
          remoteOperations: [ExplorerOperations.Remote],
        }),
      ],
    }).compile();

    await expect(ref.init()).resolves.toBeDefined();
    await ref.close();
  });
});
