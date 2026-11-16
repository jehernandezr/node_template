import { ClaimState, type AcquiredClaim } from '@platform/kernel';
import {
  ContainerRuntime,
  FixedClock,
  SequentialIdGenerator,
} from '@platform/kernel/test-utils';
import {
  OutboxStatus,
  ProcessedMessageKey,
  type ProcessedMessage,
} from '@platform/messaging';
import { ManagerIntent } from '@platform/persistence';
import { Deadline } from '@platform/primitives';
import { runProcessedMessageStoreContract } from '@platform/messaging/test-utils';
import { OutboxEntity } from '../entities/outbox.entity.js';
import { ProcessedMessageEntity } from '../entities/processed-message.entity.js';
import { ClaimTable } from '../stores/claim-table.js';
import { TypeOrmProcessedMessageStore } from '../stores/typeorm-processed-message-store.js';
import type { PlatformEntityManagers } from '../database/platform-entity-managers.js';
import { PlatformTestDatabase } from './utils/index.js';

jest.setTimeout(180_000);

const runtime = new ContainerRuntime(process.env);

const T0 = new Date('2026-11-12T10:00:00.000Z');

runtime.describeIfAvailable(
  'TypeOrmProcessedMessageStore over PostgreSQL',
  () => {
    const database = new PlatformTestDatabase();

    beforeAll(async () => {
      await database.start();
    });

    afterAll(async () => {
      await database.stop();
    });

    runProcessedMessageStoreContract(async () => {
      await database.truncateAll();
      const managers = await database.pinned(PlatformTestDatabase.SHARD_A);
      const clock = new FixedClock();
      return {
        store: new TypeOrmProcessedMessageStore(
          new ClaimTable<ProcessedMessage>(
            ProcessedMessageEntity,
            managers,
            new SequentialIdGenerator(),
            clock,
          ),
        ),
        clock,
      };
    });

    describe('across shards', () => {
      const KEY = ProcessedMessageKey.of('audit', 'm1');
      const FINGERPRINT = 'fp';
      const RESULT: ProcessedMessage = { processedAt: T0.getTime() };

      beforeEach(async () => {
        await database.truncateAll();
      });

      function storeOn(
        managers: PlatformEntityManagers,
        clock: FixedClock,
      ): TypeOrmProcessedMessageStore {
        return new TypeOrmProcessedMessageStore(
          new ClaimTable<ProcessedMessage>(
            ProcessedMessageEntity,
            managers,
            new SequentialIdGenerator(),
            clock,
          ),
        );
      }

      it('purges the completed messages of every shard when it is not pinned to one', async () => {
        const clock = new FixedClock(T0);
        for (const shard of [
          PlatformTestDatabase.SHARD_A,
          PlatformTestDatabase.SHARD_B,
        ]) {
          const store = storeOn(await database.pinned(shard), clock);
          const claim = await store.claim(KEY, {
            fingerprint: FINGERPRINT,
            deadline: Deadline.after(1_000, clock),
          });
          await store.complete(
            KEY,
            (claim as AcquiredClaim).claimToken,
            RESULT,
          );
        }

        const unpinned = new TypeOrmProcessedMessageStore(
          new ClaimTable<ProcessedMessage>(
            ProcessedMessageEntity,
            database.managers,
            new SequentialIdGenerator(),
            clock,
          ),
        );
        await expect(
          unpinned.purgeCompleted(new Date(T0.getTime() + 1)),
        ).resolves.toBe(2);
      });

      it('rolls back the effects of the handler together with the completion', async () => {
        const clock = new FixedClock(T0);
        const store = new TypeOrmProcessedMessageStore(
          new ClaimTable<ProcessedMessage>(
            ProcessedMessageEntity,
            database.managers,
            new SequentialIdGenerator(),
            clock,
          ),
        );
        const claim = await database.db.runAs(
          PlatformTestDatabase.TENANT_A,
          () =>
            store.claim(KEY, {
              fingerprint: FINGERPRINT,
              deadline: Deadline.after(1_000, clock),
            }),
        );
        expect(claim.state).toBe(ClaimState.Acquired);
        const token = (claim as AcquiredClaim).claimToken;

        await expect(
          database.db.runAs(PlatformTestDatabase.TENANT_A, () =>
            database.db.transactions.runInTransaction(async () => {
              await database.managers.run(ManagerIntent.Write, (manager) =>
                manager.insert(OutboxEntity, {
                  id: 'm-1',
                  envelope: { id: 'm-1' } as never,
                  status: OutboxStatus.Pending,
                  attempts: 0,
                  nextAttemptAt: T0,
                  createdAt: T0,
                  updatedAt: T0,
                  groupId: null,
                  delayMs: null,
                  lastError: null,
                  leaseOwner: null,
                  leaseToken: null,
                  leaseExpiresAt: null,
                }),
              );
              await store.complete(KEY, token, RESULT);
              throw new Error('rollback');
            }),
          ),
        ).rejects.toThrow('rollback');

        const outbox = await database.db.runAs(
          PlatformTestDatabase.TENANT_A,
          () =>
            database.managers.run(ManagerIntent.ReadPrimary, (manager) =>
              manager.count(OutboxEntity),
            ),
        );
        expect(outbox).toBe(0);
        await expect(
          database.db.runAs(PlatformTestDatabase.TENANT_A, () =>
            store.claim(KEY, {
              fingerprint: FINGERPRINT,
              deadline: Deadline.after(1_000, clock),
            }),
          ),
        ).resolves.toMatchObject({ state: ClaimState.InProgress });
      });
    });
  },
);
