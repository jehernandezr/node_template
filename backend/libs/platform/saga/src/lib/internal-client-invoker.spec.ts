import {
  Compensation,
  defineOperation,
  PlatformErrorCode,
  type OperationDefinition,
} from '@contracts/platform';
import { context as otelContext } from '@opentelemetry/api';
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';
import {
  ContractRegistry,
  InMemoryProcessedOperationStore,
  InProcessTransport,
  InternalClient,
  InternalRouter,
  type CallMeta,
} from '@platform/internal-api';
import { FixedClock, SequentialIdGenerator } from '@platform/kernel/testing';
import {
  contextFromTraceparent,
  currentTraceparent,
  parseTraceparent,
} from '@platform/observability';
import { CallOutcome, type ClaimRequest } from '@platform/primitives';
import { z } from 'zod';
import { SagaDefinition } from './definition/saga-definition.js';
import type { SagaFlow } from './definition/saga-flow.js';
import {
  SagaDefinitionIssueCode,
  type SagaDefinitionIssue,
} from './definition/saga-validation.js';
import { SagaErrorCode, SimulatedCrash } from './errors.js';
import { InternalClientInvoker } from './internal-client-invoker.js';
import type { InvokeOptions, OperationInvoker } from './invoker.js';
import { SagaStatus } from './model.js';
import { SagaRecoveryJob } from './recovery/saga-recovery-job.js';
import { SagaEngine } from './engine/saga-engine.js';
import { InMemorySagaStore } from './store/in-memory-saga-store.js';

/** Fits the 2 s step budget of these tests: 2 x 500 ms + 100 ms of backoff. */
const FAST = {
  timeoutMs: 500,
  retry: { maxAttempts: 2, baseMs: 10, maxMs: 100 },
} as const;

const CreateAccount = defineOperation({
  id: 'acct.create.v1',
  input: z.object({ name: z.string().min(1) }),
  output: z.object({ accountId: z.string() }),
  idempotent: true,
  compensatedBy: 'acct.remove.v1',
  description: 'Creates an account.',
  ...FAST,
});

const RemoveAccount = defineOperation({
  id: 'acct.remove.v1',
  input: z.object({ accountId: z.string() }),
  output: z.object({ removed: z.boolean() }),
  idempotent: true,
  compensatedBy: Compensation.None,
  compensationReason: 'Removing an account is not undone.',
  description: 'Removes an account.',
  ...FAST,
});

const Notify = defineOperation({
  id: 'acct.notify.v1',
  input: z.object({ accountId: z.string() }),
  output: z.object({ sent: z.boolean() }),
  idempotent: true,
  mutating: false,
  description: 'Sends the welcome message.',
  ...FAST,
});

interface State {
  name: string;
  accountId?: string;
}

class OnboardingSaga extends SagaDefinition<State> {
  readonly type = 'onboarding';

  protected define(flow: SagaFlow<State>): void {
    flow
      .step(CreateAccount)
      .input((s) => ({ name: s.name }))
      .onSuccess((s, out) => {
        s.accountId = out.accountId;
      })
      .compensationInput((s) => ({ accountId: s.accountId ?? '' }))
      .pivot()
      .step(Notify)
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
  const notified = jest.fn(async () => CallOutcome.success({ sent: true }));
  router.register(Notify, notified);

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
  return {
    clock,
    claims,
    created,
    notified,
    sent,
    store,
    engine,
    invoker,
    registry,
  };
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

  it('derives the server lease from the attempt deadline, cut to the step budget', async () => {
    const { clock, claims, engine } = wire();
    const start = clock.now().getTime();

    await engine('node-1').start(
      'onboarding',
      { name: 'Ana' },
      { sagaId: 's1', context },
    );

    // The attempt gets the operation timeout (500 ms), inside the 2 s step budget.
    const request = claims.mock.calls[0]?.[1];
    expect(request?.deadline.atMs).toBe(start + 500);
  });

  it('never sends a step input that breaks the contract and compensates from the previous step', async () => {
    const { created, sent, engine } = wire();

    const result = await engine('node-1').start(
      'onboarding',
      { name: '' },
      { sagaId: 's1', context },
    );

    // The invalid input is a business error, as the router would answer: the
    // step did not apply, so nothing is sent and nothing needs undoing.
    expect(sent).not.toHaveBeenCalled();
    expect(created).not.toHaveBeenCalled();
    expect(result.lastErrorCode).toBe(PlatformErrorCode.ValidationInvalidInput);
    expect(result.status).toBe(SagaStatus.Compensated);
  });
});

/** Reads the issue codes of the `SagaError` thrown by `build`. */
function issueCodes(build: () => unknown): unknown[] {
  try {
    build();
  } catch (error) {
    const details = (error as { details?: { issues?: SagaDefinitionIssue[] } })
      .details;
    return (details?.issues ?? []).map((issue) => issue.code);
  }
  return [];
}

describe('SagaEngine startup validation against the contracts', () => {
  const Charge = defineOperation({
    id: 'billing.charge.v1',
    input: z.object({ amount: z.number() }),
    output: z.object({ chargeId: z.string() }),
    idempotent: true,
    compensatedBy: 'billing.refund.v1',
    description: 'Charges.',
    ...FAST,
  });
  const Refund = defineOperation({
    id: 'billing.refund.v1',
    input: z.object({ chargeId: z.string() }),
    output: z.object({ refunded: z.boolean() }),
    idempotent: false,
    compensatedBy: Compensation.None,
    compensationReason: 'A refund is final.',
    description: 'Refunds, not idempotent.',
    ...FAST,
  });
  const Slow = defineOperation({
    id: 'billing.slow.v1',
    input: z.object({}),
    output: z.object({}),
    idempotent: true,
    mutating: false,
    timeoutMs: 1_500,
    description: 'Too slow for a 2 s step.',
  });

  function engineWith(
    saga: SagaDefinition<unknown>,
    ...registered: OperationDefinition[]
  ) {
    const clock = new FixedClock(new Date('2026-01-01T00:00:00.000Z'));
    const registry = new ContractRegistry();
    registry.register(...registered);
    const client = new InternalClient({
      transport: { invoke: async () => CallOutcome.success({}) },
      registry,
      clock,
    });
    return () =>
      new SagaEngine({
        store: new InMemorySagaStore(),
        invoker: new InternalClientInvoker(client),
        registry: new Map([[saga.type, saga]]),
        owner: 'node-1',
        clock,
        maxStepDurationMs: 2_000,
      });
  }

  class ChargeSaga extends SagaDefinition<unknown> {
    readonly type = 'charge';

    protected define(flow: SagaFlow<unknown>): void {
      flow.step(Charge).input(() => ({ amount: 1 }));
    }
  }

  it('starts when every operation and compensation is registered and fits', () => {
    const { registry } = wire();
    const build = () =>
      new SagaEngine({
        store: new InMemorySagaStore(),
        invoker: new InternalClientInvoker(
          new InternalClient({
            transport: { invoke: async () => CallOutcome.success({}) },
            registry,
          }),
        ),
        registry: new Map([['onboarding', new OnboardingSaga()]]),
        owner: 'node-1',
        maxStepDurationMs: 2_000,
      });

    expect(build).not.toThrow();
  });

  it('rejects an operation or a compensation that is not registered', () => {
    expect(issueCodes(engineWith(new ChargeSaga())).sort()).toEqual([
      SagaDefinitionIssueCode.UnregisteredCompensation,
      SagaDefinitionIssueCode.UnregisteredOperation,
    ]);
  });

  it('rejects a compensation that is not idempotent', () => {
    expect(issueCodes(engineWith(new ChargeSaga(), Charge, Refund))).toEqual([
      SagaDefinitionIssueCode.NotIdempotentCompensation,
    ]);
  });

  it('rejects a hand-written compensation that differs from the contract', () => {
    class Drifted extends SagaDefinition<unknown> {
      readonly type = 'drifted';

      protected define(flow: SagaFlow<unknown>): void {
        flow.step({ id: CreateAccount.id, compensatedBy: 'acct.archive.v1' });
      }
    }

    expect(
      issueCodes(engineWith(new Drifted(), CreateAccount, RemoveAccount)),
    ).toEqual([
      SagaDefinitionIssueCode.CompensationMismatch,
      SagaDefinitionIssueCode.UnregisteredCompensation,
    ]);
  });

  it('rejects an operation whose call budget exceeds the step budget', () => {
    class SlowSaga extends SagaDefinition<unknown> {
      readonly type = 'slow';

      protected define(flow: SagaFlow<unknown>): void {
        flow.step(Slow);
      }
    }

    // 3 attempts x 1 500 ms + 2 backoffs of 2 000 ms = 8 500 ms > 2 000 ms.
    expect(issueCodes(engineWith(new SlowSaga(), Slow))).toEqual([
      SagaDefinitionIssueCode.StepBudgetExceeded,
    ]);
  });

  it('rejects a saga registered under a key that is not its type', () => {
    const { registry } = wire();
    let caught: unknown;
    try {
      new SagaEngine({
        store: new InMemorySagaStore(),
        invoker: new InternalClientInvoker(
          new InternalClient({
            transport: { invoke: async () => CallOutcome.success({}) },
            registry,
          }),
        ),
        registry: new Map([['welcome', new OnboardingSaga()]]),
        owner: 'node-1',
        maxStepDurationMs: 2_000,
      });
    } catch (error) {
      caught = error;
    }

    expect(caught).toMatchObject({ code: SagaErrorCode.InvalidDefinition });
  });
});

describe('SagaEngine trace propagation', () => {
  const TRACE_ID = '4bf92f3577b34da6a3ce929d0e0e4736';
  const TRACEPARENT = `00-${TRACE_ID}-00f067aa0ba902b7-01`;
  const manager = new AsyncLocalStorageContextManager();

  beforeAll(() => {
    otelContext.setGlobalContextManager(manager.enable());
  });

  afterAll(() => {
    otelContext.disable();
  });

  it('keeps the trace of whoever started the saga, also for a step recovered by another node', async () => {
    const { clock, created, notified, store, engine, invoker } = wire();
    const seen: (string | undefined)[] = [];
    const record = () => {
      seen.push(parseTraceparent(currentTraceparent())?.traceId);
    };
    created.mockImplementation(async () => {
      record();
      return CallOutcome.success({ accountId: 'acc-1' });
    });
    notified.mockImplementation(async () => {
      record();
      return CallOutcome.success({ sent: true });
    });
    const crashing = new CrashAfterEffect(invoker(), CreateAccount.id);

    await expect(
      otelContext.with(contextFromTraceparent(TRACEPARENT), () =>
        engine('node-1', crashing).start(
          'onboarding',
          { name: 'Ana' },
          { sagaId: 's1', context: { tenantId: 't-1' } },
        ),
      ),
    ).rejects.toBeInstanceOf(SimulatedCrash);

    expect((await store.get('s1'))?.context).toEqual({
      tenantId: 't-1',
      traceparent: TRACEPARENT,
    });
    expect((await store.steps('s1'))[0]?.traceparent).toBe(TRACEPARENT);

    // Another node, outside any trace, resumes the saga.
    clock.advance(30_001);
    await new SagaRecoveryJob({
      engine: engine('node-2'),
      store,
      clock,
    }).runOnce();

    expect((await store.get('s1'))?.status).toBe(SagaStatus.Completed);
    expect(seen).toEqual([TRACE_ID, TRACE_ID]);
    expect(
      (await store.steps('s1')).map(
        (entry) => parseTraceparent(entry.traceparent)?.traceId,
      ),
    ).toEqual([TRACE_ID, TRACE_ID]);
  });
});
