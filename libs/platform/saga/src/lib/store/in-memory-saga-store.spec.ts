import { SagaErrorCode } from '../errors.js';
import {
  SagaInstance,
  SagaStatus,
  StepDirection,
  StepLogEntry,
  StepStatus,
} from '../model.js';
import { InMemorySagaStore } from './in-memory-saga-store.js';

const NOW = new Date('2026-01-01T00:00:00Z');
const TOKEN = 'node-1:token-a';

function instance(overrides: Partial<SagaInstance> = {}): SagaInstance {
  return {
    id: 'saga-1',
    type: 'three-step',
    idempotencyKey: null,
    status: SagaStatus.Running,
    state: { items: ['x'] },
    currentStep: 0,
    direction: StepDirection.Forward,
    version: 0,
    leaseToken: null,
    leaseUntil: null,
    nextAttemptAt: null,
    attempts: 0,
    suspendedSince: null,
    deadlineAt: null,
    lastErrorCode: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function entry(overrides: Partial<StepLogEntry> = {}): StepLogEntry {
  return {
    sagaId: 'saga-1',
    stepIndex: 0,
    operationId: 'a.create',
    direction: StepDirection.Forward,
    status: StepStatus.Dispatched,
    idempotencyKey: 'saga-1:0:forward',
    input: { name: 'a' },
    output: undefined,
    errorCode: null,
    startedAt: NOW,
    finishedAt: null,
    ...overrides,
  };
}

async function codeOf(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return (error as { code?: unknown }).code;
  }
  return undefined;
}

async function leasedStore(): Promise<InMemorySagaStore> {
  const store = new InMemorySagaStore();
  await store.create(
    instance({
      leaseToken: TOKEN,
      leaseUntil: new Date(NOW.getTime() + 30_000),
    }),
  );
  return store;
}

describe('InMemorySagaStore', () => {
  it('commits instance and step together and bumps the version', async () => {
    const store = await leasedStore();

    const saved = await store.commitStep({
      instance: instance({ currentStep: 1 }),
      expectedVersion: 0,
      leaseToken: TOKEN,
      step: entry({ status: StepStatus.Succeeded }),
    });

    expect(saved.version).toBe(1);
    expect(saved.leaseToken).toBe(TOKEN);
    expect((await store.get('saga-1'))?.currentStep).toBe(1);
    expect((await store.steps('saga-1'))[0].status).toBe(StepStatus.Succeeded);
  });

  it('rejects a stale version without writing anything', async () => {
    const store = await leasedStore();
    await store.commitStep({
      instance: instance(),
      expectedVersion: 0,
      leaseToken: TOKEN,
    });

    expect(
      await codeOf(
        store.commitStep({
          instance: instance({ currentStep: 2 }),
          expectedVersion: 0,
          leaseToken: TOKEN,
          step: entry(),
        }),
      ),
    ).toBe(SagaErrorCode.ConcurrentModification);
    expect((await store.get('saga-1'))?.currentStep).toBe(0);
    expect(await store.steps('saga-1')).toEqual([]);
  });

  it('rejects a foreign lease token without writing anything', async () => {
    const store = await leasedStore();

    expect(
      await codeOf(
        store.commitStep({
          instance: instance({ currentStep: 1 }),
          expectedVersion: 0,
          leaseToken: 'node-2:token-b',
          step: entry(),
        }),
      ),
    ).toBe(SagaErrorCode.LeaseLost);
    expect((await store.get('saga-1'))?.version).toBe(0);
    expect(await store.steps('saga-1')).toEqual([]);
  });

  it('dispatches only Dispatched entries, under the same fence', async () => {
    const store = await leasedStore();

    expect(
      await codeOf(
        store.dispatchStep({
          instance: instance(),
          expectedVersion: 0,
          leaseToken: TOKEN,
          step: entry({ status: StepStatus.Succeeded }),
        }),
      ),
    ).toBe(SagaErrorCode.InvalidState);

    const saved = await store.dispatchStep({
      instance: instance(),
      expectedVersion: 0,
      leaseToken: TOKEN,
      step: entry(),
    });
    expect(saved.version).toBe(1);
  });

  it('deep-copies state and keeps dates as Date objects on read', async () => {
    const store = new InMemorySagaStore();
    const original = instance();
    await store.create(original);

    (original.state as { items: string[] }).items.push('mutated');
    const read = await store.get('saga-1');
    (read?.state as { items: string[] }).items.push('mutated again');

    const again = await store.get('saga-1');
    expect(again?.state).toEqual({ items: ['x'] });
    expect(again?.createdAt).toBeInstanceOf(Date);
  });

  it('grants a lease only when it is free or expired, and renews only the holder', async () => {
    const store = new InMemorySagaStore();
    await store.create(instance());
    const until = new Date(NOW.getTime() + 30_000);

    expect(await store.tryAcquireLease('saga-1', TOKEN, until, NOW)).toBe(true);
    expect(await store.tryAcquireLease('saga-1', 'node-2:x', until, NOW)).toBe(
      false,
    );
    expect(await store.renewLease('saga-1', 'node-2:x', until)).toBe(false);
    expect(
      await store.renewLease('saga-1', TOKEN, new Date(NOW.getTime() + 60_000)),
    ).toBe(true);

    await store.releaseLease('saga-1', 'node-2:x');
    expect((await store.get('saga-1'))?.leaseToken).toBe(TOKEN);
    await store.releaseLease('saga-1', TOKEN);
    expect((await store.get('saga-1'))?.leaseToken).toBeNull();
  });

  it('finds sagas with expired leases or due retries only', async () => {
    const store = new InMemorySagaStore();
    await store.create(
      instance({
        id: 'leased',
        status: SagaStatus.Running,
        leaseToken: TOKEN,
        leaseUntil: new Date(NOW.getTime() + 1_000),
      }),
    );
    await store.create(
      instance({ id: 'orphan', status: SagaStatus.Compensating }),
    );
    await store.create(
      instance({
        id: 'due',
        status: SagaStatus.Suspended,
        nextAttemptAt: new Date(NOW.getTime() - 1),
      }),
    );
    await store.create(
      instance({
        id: 'later',
        status: SagaStatus.Suspended,
        nextAttemptAt: new Date(NOW.getTime() + 60_000),
      }),
    );
    await store.create(
      instance({ id: 'intervention', status: SagaStatus.RequiresIntervention }),
    );
    await store.create(instance({ id: 'done', status: SagaStatus.Completed }));

    const ids = (await store.findRecoverable(NOW, 10)).map((s) => s.id).sort();

    expect(ids).toEqual(['due', 'orphan']);
  });

  it('finds an instance by idempotency key and rejects a duplicate key', async () => {
    const store = new InMemorySagaStore();
    await store.create(instance({ idempotencyKey: 'k1' }));

    expect((await store.findByIdempotencyKey('k1'))?.id).toBe('saga-1');
    expect(await store.findByIdempotencyKey('other')).toBeNull();
    expect(
      await codeOf(
        store.create(instance({ id: 'saga-2', idempotencyKey: 'k1' })),
      ),
    ).toBe(SagaErrorCode.DuplicateSaga);
  });
});
