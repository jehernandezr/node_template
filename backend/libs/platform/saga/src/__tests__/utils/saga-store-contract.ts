import { SagaErrorCode } from '../../errors/saga-error-code.enum.js';
import { SagaStatus } from '../../model/saga-status.enum.js';
import { StepDirection } from '../../model/step-direction.enum.js';
import { StepStatus } from '../../model/step-status.enum.js';
import { SagaInstanceBuilder } from './saga-instance-builder.js';
import type { SagaStoreHarness } from './saga-store-harness.js';

const NOW = SagaInstanceBuilder.NOW;
const at = (offsetMs: number): Date => new Date(NOW.getTime() + offsetMs);
const id = (n: number): string =>
  `0193f1c2-0000-7000-8000-${String(n).padStart(12, '0')}`;
const TOKEN = 'worker-a:1';

/**
 * Pruebas de contrato de `SagaStore`: las mismas corren contra el almacén en
 * memoria y contra el de Postgres, así ninguno se desvía del otro.
 * `createHarness` se llama una vez por suite; `reset` antes de cada prueba.
 */
export function runSagaStoreContract(
  name: string,
  createHarness: () => Promise<SagaStoreHarness>,
): void {
  describe(`${name} cumple el contrato de SagaStore`, () => {
    let harness: SagaStoreHarness;
    const inStore = <T>(body: () => Promise<T>): Promise<T> =>
      harness.within(body);
    const saga = (n: number) => SagaInstanceBuilder.aSaga().with({ id: id(n) });
    /** Crea una instancia con el lease de `TOKEN` hasta `until`. */
    const createLeased = async (n: number, until = at(60_000)) => {
      await harness.store.create(saga(n).build());
      await harness.store.tryAcquireLease(id(n), TOKEN, until, NOW);
    };

    beforeAll(async () => {
      harness = await createHarness();
    });
    beforeEach(async () => {
      await harness.reset();
    });

    describe('create, get y findByIdempotencyKey', () => {
      it('guarda y devuelve todos los campos', () =>
        inStore(async () => {
          const original = saga(1)
            .with({
              idempotencyKey: 'key-1',
              state: { name: 'acme', nested: { list: [1, 2] } },
              // Sin tenant: un almacén con shards exige que sea el del ámbito en curso.
              context: {
                actorId: 'actor-1',
                traceparent:
                  '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
              },
              deadlineAt: at(10_000),
              lastErrorCode: 'X.Y.Z',
              lastErrorDetail: 'detalle',
              attempts: 2,
              suspendedSince: at(5),
              nextAttemptAt: at(6),
            })
            .build();
          await harness.store.create(original);
          const read = await harness.store.get(id(1));
          expect(read?.toProps()).toEqual(original.toProps());
        }));

      it('devuelve null para una saga que no existe', () =>
        inStore(async () => {
          expect(await harness.store.get(id(99))).toBeNull();
          expect(await harness.store.findByIdempotencyKey('nada')).toBeNull();
        }));

      it('rechaza un id repetido con DuplicateSaga', () =>
        inStore(async () => {
          await harness.store.create(saga(1).build());
          await expect(
            harness.store.create(saga(1).build()),
          ).rejects.toMatchObject({ code: SagaErrorCode.DuplicateSaga });
        }));

      it('rechaza una llave de idempotencia repetida y la encuentra', () =>
        inStore(async () => {
          await harness.store.create(
            saga(1).with({ idempotencyKey: 'k' }).build(),
          );
          await expect(
            harness.store.create(saga(2).with({ idempotencyKey: 'k' }).build()),
          ).rejects.toMatchObject({ code: SagaErrorCode.DuplicateSaga });
          expect((await harness.store.findByIdempotencyKey('k'))?.id).toBe(
            id(1),
          );
        }));

      it('admite varias instancias sin llave', () =>
        inStore(async () => {
          await harness.store.create(saga(1).build());
          await harness.store.create(saga(2).build());
          expect(await harness.store.get(id(2))).not.toBeNull();
        }));
    });

    describe('commitStep y dispatchStep', () => {
      it('escribe instancia y paso juntos y sube la versión en uno', () =>
        inStore(async () => {
          await createLeased(1);
          const dispatched = SagaInstanceBuilder.aStep(id(1), 0);
          const saved = await harness.store.dispatchStep({
            instance: saga(1).with({ currentStep: 1 }).build(),
            expectedVersion: 0,
            leaseToken: TOKEN,
            step: dispatched,
          });
          expect(saved.version).toBe(1);
          expect(saved.currentStep).toBe(1);
          expect(await harness.store.steps(id(1))).toEqual([dispatched]);
        }));

      it('no cambia el lease: lo manejan los métodos de lease', () =>
        inStore(async () => {
          await createLeased(1);
          const saved = await harness.store.commitStep({
            instance: saga(1)
              .with({ leaseToken: 'otro', leaseUntil: null })
              .build(),
            expectedVersion: 0,
            leaseToken: TOKEN,
          });
          expect(saved.leaseToken).toBe(TOKEN);
          expect(saved.leaseUntil).toEqual(at(60_000));
        }));

      it('reemplaza la entrada del mismo paso y dirección', () =>
        inStore(async () => {
          await createLeased(1);
          await harness.store.dispatchStep({
            instance: saga(1).build(),
            expectedVersion: 0,
            leaseToken: TOKEN,
            step: SagaInstanceBuilder.aStep(id(1), 0),
          });
          const done = SagaInstanceBuilder.aStep(id(1), 0, {
            status: StepStatus.Succeeded,
            output: { accountId: 'a-1' },
            finishedAt: at(5),
          });
          await harness.store.commitStep({
            instance: saga(1).build(),
            expectedVersion: 1,
            leaseToken: TOKEN,
            step: done,
          });
          expect(await harness.store.steps(id(1))).toEqual([done]);
        }));

      it('devuelve la bitácora por paso, con hacia delante antes que compensar', () =>
        inStore(async () => {
          await createLeased(1);
          const entries = [
            SagaInstanceBuilder.aStep(id(1), 1, {
              direction: StepDirection.Compensate,
            }),
            SagaInstanceBuilder.aStep(id(1), 1),
            SagaInstanceBuilder.aStep(id(1), 0),
          ];
          let version = 0;
          for (const step of entries) {
            await harness.store.commitStep({
              instance: saga(1).build(),
              expectedVersion: version,
              leaseToken: TOKEN,
              step,
            });
            version += 1;
          }
          const stored = await harness.store.steps(id(1));
          expect(stored.map((e) => [e.stepIndex, e.direction])).toEqual([
            [0, StepDirection.Forward],
            [1, StepDirection.Forward],
            [1, StepDirection.Compensate],
          ]);
        }));

      it('rechaza un token ajeno con LeaseLost sin escribir nada', () =>
        inStore(async () => {
          await createLeased(1);
          await expect(
            harness.store.commitStep({
              instance: saga(1).with({ status: SagaStatus.Completed }).build(),
              expectedVersion: 0,
              leaseToken: 'intruso',
              step: SagaInstanceBuilder.aStep(id(1), 0),
            }),
          ).rejects.toMatchObject({ code: SagaErrorCode.LeaseLost });
          expect((await harness.store.get(id(1)))?.status).toBe(
            SagaStatus.Running,
          );
          expect(await harness.store.steps(id(1))).toEqual([]);
        }));

      it('rechaza una versión vieja con ConcurrentModification sin escribir nada', () =>
        inStore(async () => {
          await createLeased(1);
          await harness.store.commitStep({
            instance: saga(1).build(),
            expectedVersion: 0,
            leaseToken: TOKEN,
          });
          await expect(
            harness.store.commitStep({
              instance: saga(1).with({ status: SagaStatus.Completed }).build(),
              expectedVersion: 0,
              leaseToken: TOKEN,
              step: SagaInstanceBuilder.aStep(id(1), 0),
            }),
          ).rejects.toMatchObject({
            code: SagaErrorCode.ConcurrentModification,
          });
          expect((await harness.store.get(id(1)))?.version).toBe(1);
          expect(await harness.store.steps(id(1))).toEqual([]);
        }));

      it('rechaza una saga que no existe con NotFound', () =>
        inStore(async () => {
          await expect(
            harness.store.commitStep({
              instance: saga(7).build(),
              expectedVersion: 0,
              leaseToken: TOKEN,
            }),
          ).rejects.toMatchObject({ code: SagaErrorCode.NotFound });
        }));

      it('dispatchStep solo acepta entradas Dispatched', () =>
        inStore(async () => {
          await createLeased(1);
          await expect(
            harness.store.dispatchStep({
              instance: saga(1).build(),
              expectedVersion: 0,
              leaseToken: TOKEN,
              step: SagaInstanceBuilder.aStep(id(1), 0, {
                status: StepStatus.Succeeded,
              }),
            }),
          ).rejects.toMatchObject({ code: SagaErrorCode.InvalidState });
        }));
    });

    describe('leases', () => {
      it('toma el lease libre y lo rechaza mientras otro lo tiene', () =>
        inStore(async () => {
          await harness.store.create(saga(1).build());
          expect(
            await harness.store.tryAcquireLease(id(1), TOKEN, at(1_000), NOW),
          ).toBe(true);
          expect(
            await harness.store.tryAcquireLease(
              id(1),
              'otro',
              at(2_000),
              at(500),
            ),
          ).toBe(false);
          const read = await harness.store.get(id(1));
          expect(read?.leaseToken).toBe(TOKEN);
          expect(read?.leaseUntil).toEqual(at(1_000));
        }));

      it('toma un lease vencido', () =>
        inStore(async () => {
          await harness.store.create(saga(1).build());
          await harness.store.tryAcquireLease(id(1), TOKEN, at(1_000), NOW);
          expect(
            await harness.store.tryAcquireLease(
              id(1),
              'otro',
              at(9_000),
              at(1_000),
            ),
          ).toBe(true);
          expect((await harness.store.get(id(1)))?.leaseToken).toBe('otro');
        }));

      it('devuelve false al tomar el lease de una saga que no existe', () =>
        inStore(async () => {
          expect(
            await harness.store.tryAcquireLease(id(9), TOKEN, at(1_000), NOW),
          ).toBe(false);
        }));

      it('solo el dueño renueva y suelta', () =>
        inStore(async () => {
          await createLeased(1, at(1_000));
          expect(await harness.store.renewLease(id(1), 'otro', at(5_000))).toBe(
            false,
          );
          expect(await harness.store.renewLease(id(1), TOKEN, at(5_000))).toBe(
            true,
          );
          expect((await harness.store.get(id(1)))?.leaseUntil).toEqual(
            at(5_000),
          );
          await harness.store.releaseLease(id(1), 'otro');
          expect((await harness.store.get(id(1)))?.leaseToken).toBe(TOKEN);
          await harness.store.releaseLease(id(1), TOKEN);
          const released = await harness.store.get(id(1));
          expect(released?.leaseToken).toBeNull();
          expect(released?.leaseUntil).toBeNull();
        }));
    });

    describe('findRecoverable', () => {
      it('devuelve lo que necesita una corrida y nada más', () =>
        inStore(async () => {
          const create = (
            n: number,
            patch: Parameters<SagaInstanceBuilder['with']>[0],
          ) => harness.store.create(saga(n).with(patch).build());
          await create(1, {
            status: SagaStatus.Running,
            leaseUntil: at(-1),
            leaseToken: 'x',
          });
          await create(2, {
            status: SagaStatus.Compensating,
            leaseUntil: null,
          });
          await create(3, {
            status: SagaStatus.Suspended,
            nextAttemptAt: at(-1),
          });
          await create(4, {
            status: SagaStatus.Running,
            leaseUntil: at(60_000),
            leaseToken: 'x',
          });
          await create(5, {
            status: SagaStatus.Suspended,
            nextAttemptAt: at(60_000),
          });
          await create(6, { status: SagaStatus.Completed });
          await create(7, { status: SagaStatus.Compensated });
          await create(8, { status: SagaStatus.CompensationFailed });
          await create(9, { status: SagaStatus.RequiresIntervention });
          const found = await harness.store.findRecoverable(NOW, 50);
          expect(found.map((instance) => instance.id).sort()).toEqual([
            id(1),
            id(2),
            id(3),
          ]);
        }));

      it('respeta el límite y entrega primero las más antiguas', () =>
        inStore(async () => {
          for (const [n, updatedAt] of [
            [1, at(-30)],
            [2, at(-10)],
            [3, at(-20)],
          ] as const) {
            await harness.store.create(saga(n).with({ updatedAt }).build());
          }
          const found = await harness.store.findRecoverable(NOW, 2);
          expect(found.map((instance) => instance.id)).toEqual([id(1), id(3)]);
        }));
    });

    describe('purge', () => {
      it('borra solo las terminadas con éxito y viejas, con su bitácora', () =>
        inStore(async () => {
          const create = (n: number, status: SagaStatus, updatedAt: Date) =>
            harness.store.create(saga(n).with({ status, updatedAt }).build());
          await create(1, SagaStatus.Completed, at(-1_000));
          await create(2, SagaStatus.Compensated, at(-1_000));
          await create(3, SagaStatus.Completed, at(1_000));
          await create(4, SagaStatus.CompensationFailed, at(-1_000));
          await create(5, SagaStatus.RequiresIntervention, at(-1_000));
          await create(6, SagaStatus.Running, at(-1_000));
          await harness.store.tryAcquireLease(id(1), TOKEN, at(60_000), NOW);
          await harness.store.commitStep({
            instance: saga(1)
              .with({ status: SagaStatus.Completed, updatedAt: at(-1_000) })
              .build(),
            expectedVersion: 0,
            leaseToken: TOKEN,
            step: SagaInstanceBuilder.aStep(id(1), 0),
          });
          expect(await harness.store.purge({ before: NOW })).toBe(2);
          expect(await harness.store.get(id(1))).toBeNull();
          expect(await harness.store.steps(id(1))).toEqual([]);
          expect(await harness.store.get(id(2))).toBeNull();
          for (const kept of [3, 4, 5, 6]) {
            expect(await harness.store.get(id(kept))).not.toBeNull();
          }
        }));

      it('respeta el límite', () =>
        inStore(async () => {
          for (const n of [1, 2, 3]) {
            await harness.store.create(
              saga(n)
                .with({ status: SagaStatus.Completed, updatedAt: at(-1_000) })
                .build(),
            );
          }
          expect(await harness.store.purge({ before: NOW, limit: 2 })).toBe(2);
        }));
    });
  });
}
