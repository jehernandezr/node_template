import { ContainerRuntime } from '@platform/kernel/test-utils';
import { PersistenceError, PersistenceErrorCode } from '@platform/persistence';
import { ShardedTestDatabase } from '@platform/persistence/test-utils';
import {
  SagaError,
  SagaErrorCode,
  StepDirection,
  StepStatus,
  SagaStatus,
} from '@platform/saga';
import {
  runSagaStoreContract,
  SagaInstanceBuilder,
} from '@platform/saga/test-utils';
import { ShardedSagaScopes } from '../sharded-saga-scopes.js';
import type { TypeOrmSagaStore } from '../typeorm-saga-store.js';
import { SagaTestDatabase } from './utils/saga-test-database.js';

jest.setTimeout(180_000);

const NOW = SagaInstanceBuilder.NOW;
const at = (offsetMs: number): Date => new Date(NOW.getTime() + offsetMs);
const TOKEN = 'worker-a:1';
const ID_A = '0193f1c2-0000-7000-8000-0000000000f1';
const ID_B = '0193f1c2-0000-7000-8000-0000000000f2';
const ID_C = '0193f1c2-0000-7000-8000-0000000000f3';
const ID_D = '0193f1c2-0000-7000-8000-0000000000f4';

new ContainerRuntime(process.env).describeIfAvailable(
  'TypeOrmSagaStore sobre Postgres en dos shards',
  () => {
    const saga = new SagaTestDatabase();
    const db = saga.db;
    let store: TypeOrmSagaStore;
    const inA = <T>(body: () => Promise<T>): Promise<T> =>
      db.runAs(ShardedTestDatabase.TENANT_A, body);
    const inB = <T>(body: () => Promise<T>): Promise<T> =>
      db.runAs(ShardedTestDatabase.TENANT_B, body);

    /** Cuenta las filas de una saga en un shard, sin pasar por el almacén. */
    async function rowsOn(shard: string, id: string): Promise<number> {
      const source = await db.sources.get({
        logicalShard: shard,
        instance: ShardedTestDatabase.INSTANCE,
      });
      const rows: { count: string }[] = await source.query(
        'SELECT count(*)::text AS count FROM "saga"."instances" WHERE "id" = $1',
        [id],
      );
      return Number(rows[0]?.count ?? 0);
    }

    beforeAll(async () => {
      await db.start();
      await db.migrate();
      store = saga.createStore();
    });

    afterAll(async () => {
      await db.stop();
    });

    runSagaStoreContract('TypeOrmSagaStore', async () => ({
      store,
      within: (body) => inA(body),
      reset: async () => {
        await db.acrossShards.run(({ dataSource }) =>
          dataSource.query('TRUNCATE "saga"."step_log", "saga"."instances"'),
        );
      },
    }));

    describe('criterios del almacén real', () => {
      beforeEach(async () => {
        await db.acrossShards.run(({ dataSource }) =>
          dataSource.query('TRUNCATE "saga"."step_log", "saga"."instances"'),
        );
      });

      it('(a) dos commitStep con la misma versión: uno gana y el otro recibe ConcurrentModification o LeaseLost', async () => {
        await inA(async () => {
          await store.create(
            SagaInstanceBuilder.aSaga().with({ id: ID_A }).build(),
          );
          await store.tryAcquireLease(ID_A, TOKEN, at(60_000), NOW);
        });
        const writer = (currentStep: number) =>
          inA(() =>
            store.commitStep({
              instance: SagaInstanceBuilder.aSaga()
                .with({ id: ID_A, currentStep })
                .build(),
              expectedVersion: 0,
              leaseToken: TOKEN,
            }),
          );

        const results = await Promise.allSettled([writer(1), writer(2)]);

        const won = results.filter((r) => r.status === 'fulfilled');
        const lost = results.filter(
          (r): r is PromiseRejectedResult => r.status === 'rejected',
        );
        expect(won).toHaveLength(1);
        expect(lost).toHaveLength(1);
        expect([
          SagaErrorCode.ConcurrentModification,
          SagaErrorCode.LeaseLost,
        ]).toContain((lost[0]?.reason as SagaError).code);
        expect((await inA(() => store.get(ID_A)))?.version).toBe(1);
      });

      it('(b) un paso que viola el CHECK deja la instancia intacta: sin versión ni estado nuevos', async () => {
        await inA(async () => {
          await store.create(
            SagaInstanceBuilder.aSaga().with({ id: ID_B }).build(),
          );
          await store.tryAcquireLease(ID_B, TOKEN, at(60_000), NOW);
        });
        const before = await inA(() => store.get(ID_B));

        await expect(
          inA(() =>
            store.commitStep({
              instance: SagaInstanceBuilder.aSaga()
                .with({
                  id: ID_B,
                  currentStep: 5,
                  status: SagaStatus.Completed,
                })
                .build(),
              expectedVersion: 0,
              leaseToken: TOKEN,
              step: SagaInstanceBuilder.aStep(ID_B, 0, {
                status: 'bogus' as StepStatus,
              }),
            }),
          ),
        ).rejects.toThrow(/saga_step_log_status_check/);

        const after = await inA(() => store.get(ID_B));
        expect(after?.toProps()).toEqual(before?.toProps());
        expect(await inA(() => store.steps(ID_B))).toEqual([]);
      });

      it('(c) findRecoverable omite la fila bloqueada por otra conexión (SKIP LOCKED) y la devuelve tras el commit', async () => {
        await inA(() =>
          store.create(SagaInstanceBuilder.aSaga().with({ id: ID_C }).build()),
        );
        const source = await db.sources.get({
          logicalShard: ShardedTestDatabase.SHARD_A,
          instance: ShardedTestDatabase.INSTANCE,
        });
        const locker = source.createQueryRunner();
        await locker.connect();
        await locker.startTransaction();
        try {
          await locker.query(
            'SELECT "id" FROM "saga"."instances" WHERE "id" = $1 FOR UPDATE',
            [ID_C],
          );

          const whileLocked = await store.findRecoverable(NOW, 50);

          expect(whileLocked.map((i) => i.id)).not.toContain(ID_C);
        } finally {
          await locker.commitTransaction();
          await locker.release();
        }

        const afterCommit = await store.findRecoverable(NOW, 50);

        expect(afterCommit.map((i) => i.id)).toContain(ID_C);
      });

      it('(d) una saga de TENANT_A no se ve con TENANT_B y vive solo en el shard de A', async () => {
        await inA(() =>
          store.create(SagaInstanceBuilder.aSaga().with({ id: ID_A }).build()),
        );

        expect(await inB(() => store.get(ID_A))).toBeNull();
        expect(await rowsOn(ShardedTestDatabase.SHARD_A, ID_A)).toBe(1);
        expect(await rowsOn(ShardedTestDatabase.SHARD_B, ID_A)).toBe(0);
      });

      it('(e) findRecoverable y purge recorren los dos shards', async () => {
        await inA(() =>
          store.create(
            SagaInstanceBuilder.aSaga()
              .with({ id: ID_A, updatedAt: at(-10_000) })
              .build(),
          ),
        );
        await inB(() =>
          store.create(
            SagaInstanceBuilder.aSaga()
              .with({ id: ID_B, updatedAt: at(-5_000) })
              .build(),
          ),
        );

        const found = await store.findRecoverable(NOW, 50);
        expect(found.map((i) => i.id)).toEqual([ID_A, ID_B]);

        await inA(() =>
          store.create(
            SagaInstanceBuilder.aSaga()
              .with({
                id: ID_C,
                status: SagaStatus.Completed,
                updatedAt: at(-20_000),
              })
              .build(),
          ),
        );
        await inB(() =>
          store.create(
            SagaInstanceBuilder.aSaga()
              .with({
                id: ID_D,
                status: SagaStatus.Completed,
                updatedAt: at(-20_000),
              })
              .build(),
          ),
        );

        expect(await store.purge({ before: NOW })).toBe(2);
        expect(await rowsOn(ShardedTestDatabase.SHARD_A, ID_C)).toBe(0);
        expect(await rowsOn(ShardedTestDatabase.SHARD_B, ID_D)).toBe(0);
      });

      it('(f) ShardedSagaScopes encuentra una saga de B sin runAs', async () => {
        await inB(() =>
          store.create(SagaInstanceBuilder.aSaga().with({ id: ID_B }).build()),
        );
        const instance = SagaInstanceBuilder.aSaga()
          .with({
            id: ID_B,
            context: { tenantId: ShardedTestDatabase.TENANT_B },
          })
          .build();

        const found = await new ShardedSagaScopes(db.scope).run(instance, () =>
          store.get(ID_B),
        );

        expect(found?.id).toBe(ID_B);
      });

      it('(g) create con una instancia de TENANT_B dentro de TENANT_A lanza PersistenceTenantMismatch', async () => {
        const foreign = SagaInstanceBuilder.aSaga()
          .with({
            id: ID_C,
            context: { tenantId: ShardedTestDatabase.TENANT_B },
          })
          .build();

        const error = await inA(() => store.create(foreign)).catch(
          (e: unknown) => e,
        );

        expect(error).toBeInstanceOf(PersistenceError);
        expect((error as PersistenceError).code).toBe(
          PersistenceErrorCode.TenantMismatch,
        );
      });

      it('(h) una saga de TENANT_B sin contexto aparece como recuperable con su tenant y se lee con ShardedSagaScopes', async () => {
        await inB(() =>
          store.create(
            SagaInstanceBuilder.aSaga()
              .with({ id: ID_B, context: null })
              .build(),
          ),
        );

        const candidate = (await store.findRecoverable(NOW, 50)).find(
          (i) => i.id === ID_B,
        );

        expect(candidate?.tenantId).toBe(ShardedTestDatabase.TENANT_B);
        if (candidate === undefined) {
          throw new Error('la saga de B no es recuperable');
        }
        const found = await new ShardedSagaScopes(db.scope).run(candidate, () =>
          store.get(ID_B),
        );
        expect(found).not.toBeNull();
        expect(found?.context).toBeNull();
      });

      it('la bitácora devuelve hacia delante antes que compensar en la misma posición', async () => {
        await inA(async () => {
          await store.create(
            SagaInstanceBuilder.aSaga().with({ id: ID_A }).build(),
          );
          await store.tryAcquireLease(ID_A, TOKEN, at(60_000), NOW);
        });
        const compensate = SagaInstanceBuilder.aStep(ID_A, 0, {
          direction: StepDirection.Compensate,
          status: StepStatus.Succeeded,
        });

        await inA(() =>
          store.commitStep({
            instance: SagaInstanceBuilder.aSaga().with({ id: ID_A }).build(),
            expectedVersion: 0,
            leaseToken: TOKEN,
            step: compensate,
          }),
        );

        const steps = await inA(() => store.steps(ID_A));
        expect(steps.map((s) => s.direction)).toEqual([
          StepDirection.Compensate,
        ]);
      });
    });
  },
);
