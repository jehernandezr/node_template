import { defineOperation } from '@contracts/platform';
import {
  ContractRegistry,
  InMemoryProcessedOperationStore,
  InProcessTransport,
  InternalClient,
  InternalRouter,
  type CallMeta,
} from '@platform/internal-api';
import { FixedClock, SequentialIdGenerator } from '@platform/kernel/testing';
import { CallOutcome, type ClaimRequest } from '@platform/primitives';
import { z } from 'zod';
import { SagaDefinition } from './definition/saga-definition.js';
import type { OperationRef, SagaFlow } from './definition/saga-flow.js';
import { SagaErrorCode, SimulatedCrash } from './errors.js';
import { InternalClientInvoker } from './internal-client-invoker.js';
import type { InvokeOptions, OperationInvoker } from './invoker.js';
import { SagaStatus } from './model.js';
import { SagaRecoveryJob } from './recovery/saga-recovery-job.js';
import { SagaEngine } from './engine/saga-engine.js';
import { InMemorySagaStore } from './store/in-memory-saga-store.js';

const CreateAccount = defineOperation({
  id: 'acct.create.v1',
  input: z.object({ name: z.string().min(1) }),
  output: z.object({ accountId: z.string() }),
  idempotent: true,
  compensatedBy: 'acct.remove.v1',
  description: 'Creates an account.',
});

const RemoveAccount = defineOperation({
  id: 'acct.remove.v1',
  input: z.object({ accountId: z.string() }),
  output: z.object({ removed: z.boolean() }),
  idempotent: true,
  compensatedBy: 'acct.create.v1',
  description: 'Removes an account.',
});

const Notify = defineOperation({
  id: 'acct.notify.v1',
  input: z.object({ accountId: z.string() }),
  output: z.object({ sent: z.boolean() }),
  idempotent: true,
  mutating: false,
  description: 'Sends the welcome message.',
});

const CREATE: OperationRef<{ name: string }, { accountId: string }> = {
  id: CreateAccount.id,
  compensatedBy: RemoveAccount.id,
};
const NOTIFY: OperationRef<{ accountId: string }, { sent: boolean }> = {
  id: Notify.id,
  compensatedBy: null,
};

interface State {
  name: string;
  accountId?: string;
}

class OnboardingSaga extends SagaDefinition<State> {
  readonly type = 'onboarding';

  protected define(flow: SagaFlow<State>): void {
    flow
      .step(CREATE)
      .input((s) => ({ name: s.name }))
      .onSuccess((s, out) => {
        s.accountId = out.accountId;
      })
      .compensationInput((s) => ({ accountId: s.accountId ?? '' }))
      .pivot()
      .step(NOTIFY)
      .input((s) => ({ accountId: s.accountId ?? '' }));
  }
}

/** Invoker that performs the call and then dies once, before the outcome is logged. */
class CrashAfterEffect implements OperationInvoker {
  private armed = true;

  constructor(
    private readonly inner: OperationInvoker,
    private readonly operationId: string,
  ) {}

  async invoke(
    operationId: string,
    input: unknown,
    key: string,
    options?: InvokeOptions,
  ) {
    const result = await this.inner.invoke(operationId, input, key, options);
    if (this.armed && operationId === this.operationId) {
      this.armed = false;
      throw new SimulatedCrash(`after effect of ${operationId}`);
    }
    return result;
  }
}

const context = {
  tenantId: 't-1',
  actorId: 'u-1',
  traceparent: '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
};

function wire() {
  const clock = new FixedClock(new Date('2026-01-01T00:00:00.000Z'));
  const processed = new InMemoryProcessedOperationStore(
    clock,
    new SequentialIdGenerator(),
  );
  const claims = jest.spyOn(processed, 'claim');
  const router = new InternalRouter({ processed, clock });
  const created = jest.fn(async () =>
    CallOutcome.success({ accountId: 'acc-1' }),
  );
  router.register(CreateAccount, created);
  router.register(RemoveAccount, async () =>
    CallOutcome.success({ removed: true }),
  );
  router.register(Notify, async () => CallOutcome.success({ sent: true }));

  const registry = new ContractRegistry();
  registry.register(CreateAccount, RemoveAccount, Notify);
  const transport = new InProcessTransport(router);
  const sent = jest.spyOn(transport, 'invoke');
  /** A new client per process, as after a restart. */
  const invoker = (): InternalClientInvoker =>
    new InternalClientInvoker(
      new InternalClient({ transport, registry, clock }),
    );

  const store = new InMemorySagaStore();
  const sagas = new Map<string, SagaDefinition<unknown>>([
    ['onboarding', new OnboardingSaga() as SagaDefinition<unknown>],
  ]);
  const engine = (owner: string, inner: OperationInvoker = invoker()) =>
    new SagaEngine({
      store,
      invoker: inner,
      registry: sagas,
      owner,
      clock,
      maxStepDurationMs: 2_000,
    });
  return { clock, claims, created, sent, store, engine, invoker };
}

function keysOf(
  claims: jest.SpyInstance<unknown, [string, ClaimRequest]>,
  operationId: string,
): string[] {
  return claims.mock.calls
    .map(([key]) => key)
    .filter((key) => (JSON.parse(key) as string[])[1] === operationId);
}

describe('InternalClientInvoker with SagaEngine', () => {
  it('rebuilds exactly the same idempotency key when a step is recovered after a crash', async () => {
    const { clock, claims, created, sent, store, engine, invoker } = wire();
    const crashing = new CrashAfterEffect(invoker(), CreateAccount.id);

    await expect(
      engine('node-1', crashing).start(
        'onboarding',
        { name: 'Ana' },
        { sagaId: 's1', context },
      ),
    ).rejects.toBeInstanceOf(SimulatedCrash);
    expect(created).toHaveBeenCalledTimes(1);

    clock.advance(30_001);
    const report = await new SagaRecoveryJob({
      engine: engine('node-2'),
      store,
      clock,
    }).runOnce();

    expect(report.resumed).toEqual(['s1']);
    expect((await store.get('s1'))?.status).toBe(SagaStatus.Completed);
    const keys = keysOf(claims, CreateAccount.id);
    expect(keys).toEqual([
      '["t-1","acct.create.v1","s1:0:forward"]',
      '["t-1","acct.create.v1","s1:0:forward"]',
    ]);
    // The second call replays the stored result: the effect happened once.
    expect(created).toHaveBeenCalledTimes(1);
    const metas = sent.mock.calls
      .filter(([operationId]) => operationId === CreateAccount.id)
      .map(([, , meta]: [string, unknown, CallMeta]) => ({
        idempotencyKey: meta.idempotencyKey,
        tenantId: meta.tenantId,
        actorId: meta.actorId,
        traceparent: meta.traceparent,
      }));
    expect(metas[1]).toEqual(metas[0]);
    expect(metas[0]).toEqual({ idempotencyKey: 's1:0:forward', ...context });
  });

  it('derives the client attempt and the server lease from the step deadline', async () => {
    const { clock, claims, engine } = wire();
    const start = clock.now().getTime();

    await engine('node-1').start(
      'onboarding',
      { name: 'Ana' },
      { sagaId: 's1', context },
    );

    const request = claims.mock.calls[0]?.[1];
    expect(request?.deadline.atMs).toBe(start + 2_000);
  });

  it('never sends a step input that breaks the contract and compensates it as a protocol violation', async () => {
    const { created, sent, engine } = wire();

    const result = await engine('node-1').start(
      'onboarding',
      { name: '' },
      { sagaId: 's1', context },
    );

    // The create never left the process; only the precautionary remove did.
    expect(sent.mock.calls.map(([operationId]) => operationId)).toEqual([
      RemoveAccount.id,
    ]);
    expect(created).not.toHaveBeenCalled();
    expect(result.lastErrorCode).toBe(SagaErrorCode.ProtocolViolation);
    expect(result.status).toBe(SagaStatus.Compensated);
  });
});
