import 'reflect-metadata';
import { type DynamicModule } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { defineOperation } from '@contracts/platform';
import { z } from 'zod';
import { InternalApiErrorCode } from '../../errors/internal-api-error-code.enum.js';
import { InMemoryProcessedOperationStore } from '../../__tests__/utils/index.js';
import { ProcessedOperationRetentionJob } from '../../server/processed-operation-retention-job.js';
import { InternalApiModule } from '../internal-api.module.js';
import { InternalTransportKind } from '../internal-transport-kind.enum.js';
import { PublishedContracts } from '../published-contracts.js';
import { DecoratedHandlers } from './utils/decorated-handlers.js';
import { ExplorerOperations } from './utils/explorer-operations.js';
import { InternalApiPlatformTestingModule } from './utils/index.js';
import { RecordingPurgeableStore } from '../../server/__tests__/utils/recording-purgeable-store.js';

/** Global module that exposes the purgeable store to `InternalApiModule`, which does not see the root providers. */
const PurgeableStoreModule: DynamicModule = {
  module: class PurgeableStoreTestingModule {},
  global: true,
  providers: [RecordingPurgeableStore],
  exports: [RecordingPurgeableStore],
};

/** Operation that modifies data without a compensation declared in the registry. */
const Uncompensated = defineOperation({
  id: 'stock.reserve.v1',
  input: z.object({ sku: z.string() }),
  output: z.object({ reservationId: z.string() }),
  idempotent: true,
  compensatedBy: 'stock.unknown.v1',
  errors: [],
  description: 'Reserves stock.',
});

describe('InternalApiModule', () => {
  describe('retention job', () => {
    it('get, purgeable store configured, returns the job and run purges before now minus retention', async () => {
      const ref = await Test.createTestingModule({
        imports: [
          InternalApiPlatformTestingModule,
          PurgeableStoreModule,
          InternalApiModule.forRoot({
            transport: InternalTransportKind.InProcess,
            processedStore: InMemoryProcessedOperationStore,
            purgeableStore: RecordingPurgeableStore,
            operations: [],
            retentionMs: 1000,
          }),
        ],
      }).compile();
      const store = ref.get(RecordingPurgeableStore);

      const before = Date.now();
      await ref.get(ProcessedOperationRetentionJob).run();
      const after = Date.now();

      expect(store.purgedBefore).toHaveLength(1);
      const cut = store.purgedBefore[0]?.getTime();
      expect(cut).toBeGreaterThanOrEqual(before - 1000);
      expect(cut).toBeLessThanOrEqual(after - 1000);
      await ref.close();
    });

    it('get, no purgeable store, the job is not registered', async () => {
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

      expect(() => ref.get(ProcessedOperationRetentionJob)).toThrow();
      await ref.close();
    });
  });

  describe('composition options', () => {
    it('forRoot, isGlobal false, the module is not global', () => {
      const module = InternalApiModule.forRoot({
        transport: InternalTransportKind.InProcess,
        processedStore: InMemoryProcessedOperationStore,
        operations: [],
        isGlobal: false,
      });

      expect(module.global).toBe(false);
    });

    it('forRoot, without isGlobal, the module is global', () => {
      const module = InternalApiModule.forRoot({
        transport: InternalTransportKind.InProcess,
        processedStore: InMemoryProcessedOperationStore,
        operations: [],
      });

      expect(module.global).toBe(true);
    });

    it('forRootAsync, factory options, publishes the operations it returns', async () => {
      const ref = await Test.createTestingModule({
        imports: [
          InternalApiPlatformTestingModule,
          InternalApiModule.forRootAsync({
            transport: InternalTransportKind.InProcess,
            processedStore: InMemoryProcessedOperationStore,
            useFactory: () => ({
              operations: [ExplorerOperations.Count, ExplorerOperations.Echo],
            }),
          }),
        ],
        providers: [DecoratedHandlers],
      }).compile();
      await ref.init();

      expect(
        ref.get(PublishedContracts).get(ExplorerOperations.Count.id),
      ).toBeDefined();
      await ref.close();
    });

    it('compile, operation with an unregistered compensation, rejects with MissingCompensation', async () => {
      const ref = Test.createTestingModule({
        imports: [
          InternalApiPlatformTestingModule,
          InternalApiModule.forRoot({
            transport: InternalTransportKind.InProcess,
            processedStore: InMemoryProcessedOperationStore,
            operations: [Uncompensated],
          }),
        ],
      });

      await expect(ref.compile()).rejects.toMatchObject({
        code: InternalApiErrorCode.MissingCompensation,
      });
    });
  });
});
