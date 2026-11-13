import { defineOperation, PlatformErrorCode } from '@contracts/platform';
import { PlatformError } from '@platform/kernel';
import { SequentialIdGenerator } from '@platform/kernel/testing';
import { CallOutcome, stableDigest } from '@platform/primitives';
import { z } from 'zod';
import { SagaDefinition } from '../definition/saga-definition.js';
import { OperationRef, SagaFlow } from '../definition/saga-flow.js';
import { SagaError, SagaErrorCode, SimulatedCrash } from '../errors.js';
import { InvokeKind, InvokeOptions, OperationInvoker } from '../invoker.js';
import {
  Clock,
  SagaEvent,
  SagaEventKind,
  SagaInstance,
  SagaStatus,
  StepDirection,
  StepStatus,
} from '../model.js';
import { SagaRecoveryJob } from '../recovery/saga-recovery-job.js';
import { SagaStore } from '../store/saga-store.js';
import { InMemorySagaStore } from '../store/in-memory-saga-store.js';
import { SagaEngine, SagaEngineOptions } from './saga-engine.js';

interface State {
  a?: string;
  b?: string;
  c?: string;
  bAt?: string;
  post?: string;
}

interface Created {
  id: string;
  at: string;
}

const STEP_A: OperationRef<{ name: string }, Created> = {
  id: 'a.create',
  compensatedBy: 'a.remove',
};
const STEP_B: OperationRef<{ name: string }, Created> = {
  id: 'b.create',
  compensatedBy: 'b.remove',
};
const STEP_C: OperationRef<{ name: string }, Created> = {
  id: 'c.create',
  compensatedBy: 'c.remove',
};
const SEND: OperationRef<{ name: string }, Created> = {
  id: 'post.send',
  compensatedBy: null,
};

type InvokeResult = CallOutcome<unknown>;

const ok = (output: unknown = {}): InvokeResult => CallOutcome.success(output);
const business = (code: string): InvokeResult =>
  CallOutcome.businessError(code);
const transient = (): InvokeResult => CallOutcome.transientFailure('timeout');
const protocol = (): InvokeResult => CallOutcome.protocolViolation('bad shape');

class ThreeStepSaga extends SagaDefinition<State> {
  readonly type = 'three-step';

  protected define(flow: SagaFlow<State>): void {
    flow
      .step(STEP_A)
      .input(() => ({ name: 'a' }))
      .onSuccess((s, out) => {
        s.a = out.id;
      })
      .compensationInput((s) => ({ id: s.a }))
      .step(STEP_B)
      .input(() => ({ name: 'b' }))
      .onSuccess((s, out) => {
        s.b = out.id;
        s.bAt = out.at;
      })
      .compensationInput((s) => ({ id: s.b }))
      .step(STEP_C)
      .input(() => ({ name: 'c' }))
      .onSuccess((s, out) => {
        s.c = out.id;
      })
      .compensationInput((s) => ({ id: s.c }));
  }
}

class PivotSaga extends SagaDefinition<State> {
  readonly type = 'pivot-saga';

  protected define(flow: SagaFlow<State>): void {
    flow
      .step(STEP_A)
      .input(() => ({ name: 'a' }))
      .onSuccess((s, out) => {
        s.a = out.id;
      })
      .compensationInput((s) => ({ id: s.a }))
      .pivot()
      .step(SEND)
      .input(() => ({ name: 'post' }))
      .onSuccess((s, out) => {
        s.post = out.id;
      });
  }
}

class ThrowingSaga extends SagaDefinition<State> {
  readonly type = 'throwing';

  protected define(flow: SagaFlow<State>): void {
    flow
      .step(STEP_A)
      .input(() => ({ name: 'a' }))
      .onSuccess(() => {
        throw new Error('state rule failed');
      })
      .compensationInput((s) => ({ id: s.a }));
  }
}

/**
 * Fake participant. Forward operations create a resource and compensations
 * remove it. Successes are stored by idempotency key, so a replayed call returns
 * the stored result without a second effect. Created outputs carry a Date to
 * exercise output normalization.
 */
class FakeParticipant implements OperationInvoker {
  readonly calls: {
    operationId: string;
    idempotencyKey: string;
    input: unknown;
    options: InvokeOptions | undefined;
  }[] = [];
  readonly effects = new Map<string, number>();
  private readonly live = new Set<string>();
  private readonly results = new Map<string, InvokeResult>();
  private readonly scripted = new Map<string, (InvokeResult | Error)[]>();
  private sequence = 0;

  /** Queues outcomes for the next calls of `operationId`. An Error is thrown. */
  script(operationId: string, ...outcomes: (InvokeResult | Error)[]): void {
    this.scripted.set(operationId, [
      ...(this.scripted.get(operationId) ?? []),
      ...outcomes,
    ]);
  }

  get liveResources(): number {
    return this.live.size;
  }

  operations(): string[] {
    return this.calls.map((call) => call.operationId);
  }

  removes(): string[] {
    return this.operations().filter((op) => op.endsWith('.remove'));
  }

  async invoke(
    operationId: string,
    input: unknown,
    idempotencyKey: string,
    options?: InvokeOptions,
  ): Promise<InvokeResult> {
    this.calls.push({ operationId, idempotencyKey, input, options });
    const replay = this.results.get(idempotencyKey);
    if (replay !== undefined) {
      return replay;
    }
    const scripted = this.scripted.get(operationId)?.shift();
    if (scripted instanceof Error) {
      throw scripted;
    }
    if (scripted !== undefined) {
      return scripted;
    }
    const [name, verb] = operationId.split('.');
    if (verb === 'remove') {
      this.live.delete((input as { id?: string }).id ?? '');
      const result = ok();
      this.results.set(idempotencyKey, result);
      return result;
    }
    this.sequence += 1;
    const id = `${name}-${this.sequence}`;
    this.live.add(id);
    this.effects.set(operationId, (this.effects.get(operationId) ?? 0) + 1);
    const result = ok({ id, at: new Date(0) });
    this.results.set(idempotencyKey, result);
    return result;
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
  ): Promise<InvokeResult> {
    const result = await this.inner.invoke(operationId, input, key, options);
    if (this.armed && operationId === this.operationId) {
      this.armed = false;
      throw new SimulatedCrash(`after effect of ${operationId}`);
    }
    return result;
  }
}

/** Invoker that, once, lets another run finish the saga before its own call happens. */
class StaleRunInvoker implements OperationInvoker {
  private armed = true;

  constructor(
    private readonly inner: OperationInvoker,
    private readonly operationId: string,
    private readonly takeOver: () => Promise<void>,
  ) {}

  async invoke(
    operationId: string,
    input: unknown,
    key: string,
    options?: InvokeOptions,
  ): Promise<InvokeResult> {
    if (this.armed && operationId === this.operationId) {
      this.armed = false;
      await this.takeOver();
    }
    return this.inner.invoke(operationId, input, key, options);
  }
}

/** Store whose lease renewal fails on the given call. */
class FlakyRenewalStore extends InMemorySagaStore {
  private calls = 0;

  constructor(private readonly failOnCall: number) {
    super();
  }

  override async renewLease(
    id: string,
    token: string,
    until: Date,
  ): Promise<boolean> {
    this.calls += 1;
    if (this.calls === this.failOnCall) {
      return false;
    }
    return super.renewLease(id, token, until);
  }
}

class FakeClock implements Clock {
  private current = new Date('2026-01-01T00:00:00Z');

  now(): Date {
    return new Date(this.current);
  }

  advance(ms: number): void {
    this.current = new Date(this.current.getTime() + ms);
  }
}

async function codeOf(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error instanceof SagaError ? error.code : error;
  }
  return undefined;
}

function setup() {
  const store: SagaStore = new InMemorySagaStore();
  const clock = new FakeClock();
  const participant = new FakeParticipant();
  const events: SagaEvent[] = [];
  const counts = { inputs: 0, compensations: 0 };
  const cycle: Record<string, unknown> = {};
  cycle.self = cycle;
  const registry = new Map<string, SagaDefinition<unknown>>([
    ['three-step', new ThreeStepSaga()],
    ['pivot-saga', new PivotSaga()],
    ['throwing', new ThrowingSaga()],
    ['volatile', new VolatileSaga(counts)],
    ['input-bigint', new InputSaga('input-bigint', () => ({ big: BigInt(1) }))],
    [
      'input-throws',
      new InputSaga('input-throws', () => {
        throw new Error('cannot build');
      }),
    ],
    ['input-cycle', new InputSaga('input-cycle', () => cycle)],
    ['comp-input-throws', new CompensationInputSaga()],
    ['date-state', new DateStateSaga()],
  ]);
  const engineFor = (
    owner: string,
    overrides: Partial<SagaEngineOptions> = {},
  ): SagaEngine => {
    const engine = new SagaEngine({
      store,
      invoker: participant,
      registry,
      owner,
      clock,
      ...overrides,
    });
    engine.onEvent((event) => {
      events.push(event);
    });
    return engine;
  };
  const recovery = (engine: SagaEngine) =>
    new SagaRecoveryJob({ engine, store, clock });
  return {
    store,
    clock,
    participant,
    events,
    engineFor,
    recovery,
    registry,
    counts,
  };
}

function instanceRecord(overrides: Partial<SagaInstance>): SagaInstance {
  const now = new Date('2026-01-01T00:00:00Z');
  return {
    id: 'ghost',
    type: 'unregistered',
    idempotencyKey: null,
    status: SagaStatus.Running,
    state: {},
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
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/** Saga whose forward input and compensation input are built by counted, non-repeatable code. */
class VolatileSaga extends SagaDefinition<State> {
  readonly type = 'volatile';

  constructor(
    private readonly counts: { inputs: number; compensations: number },
  ) {
    super();
  }

  protected define(flow: SagaFlow<State>): void {
    flow
      .step(STEP_A)
      .input(() => ({ name: 'a' }))
      .onSuccess((s, out) => {
        s.a = out.id;
      })
      .compensationInput((s) => ({ id: s.a }))
      .step(STEP_B)
      .input(() => {
        this.counts.inputs += 1;
        return { name: 'b', seq: this.counts.inputs };
      })
      .onSuccess((s, out) => {
        s.b = out.id;
      })
      .compensationInput((s) => {
        this.counts.compensations += 1;
        return { id: s.b, seq: this.counts.compensations };
      })
      .step(STEP_C)
      .input(() => ({ name: 'c' }))
      .onSuccess((s, out) => {
        s.c = out.id;
      })
      .compensationInput((s) => ({ id: s.c }));
  }
}

const LOOSE_A: OperationRef<unknown, Created> = {
  id: 'a.create',
  compensatedBy: 'a.remove',
};

/** Saga whose first step input is produced by a supplied function. */
class InputSaga extends SagaDefinition<State> {
  constructor(
    override readonly type: string,
    private readonly produce: () => unknown,
  ) {
    super();
  }

  protected define(flow: SagaFlow<State>): void {
    flow.step(LOOSE_A).input(() => this.produce());
  }
}

/** Saga whose compensation input builder throws. */
class CompensationInputSaga extends SagaDefinition<State> {
  readonly type = 'comp-input-throws';

  protected define(flow: SagaFlow<State>): void {
    flow
      .step(STEP_A)
      .input(() => ({ name: 'a' }))
      .compensationInput(() => {
        throw new Error('no reference');
      })
      .step(STEP_C)
      .input(() => ({ name: 'c' }));
  }
}

/** Saga whose success rule leaves a non-serializable value in the state. */
class DateStateSaga extends SagaDefinition<State> {
  readonly type = 'date-state';

  protected define(flow: SagaFlow<State>): void {
    flow
      .step(STEP_A)
      .input(() => ({ name: 'a' }))
      .onSuccess((s) => {
        Object.assign(s, { when: new Date(0) });
      });
  }
}

/** Invoker whose first `hangs` calls to `operationId` never settle and record their signal. */
class HangingInvoker implements OperationInvoker {
  readonly signals: (AbortSignal | undefined)[] = [];
  private hangs: number;

  constructor(
    private readonly inner: OperationInvoker,
    private readonly operationId: string,
    hangs = 1,
  ) {
    this.hangs = hangs;
  }

  invoke(
    operationId: string,
    input: unknown,
    key: string,
    options?: InvokeOptions,
  ): Promise<InvokeResult> {
    if (operationId === this.operationId && this.hangs > 0) {
      this.hangs -= 1;
      this.signals.push(options?.signal);
      return new Promise<InvokeResult>(() => undefined);
    }
    return this.inner.invoke(operationId, input, key, options);
  }
}

describe('SagaEngine', () => {
  describe('happy path and compensation', () => {
    it('runs every step in order, completes and normalizes outputs', async () => {
      const { participant, engineFor, store, events } = setup();

      const result = await engineFor('node-1').start(
        'three-step',
        {},
        { sagaId: 's1' },
      );

      expect(result.status).toBe(SagaStatus.Completed);
      expect(result.state).toEqual({
        a: 'a-1',
        b: 'b-2',
        c: 'c-3',
        bAt: '1970-01-01T00:00:00.000Z',
      });
      expect(participant.operations()).toEqual([
        'a.create',
        'b.create',
        'c.create',
      ]);
      expect(participant.liveResources).toBe(3);
      const logged = (await store.steps('s1')).find((e) => e.stepIndex === 1);
      expect((logged?.output as Created).at).toBe('1970-01-01T00:00:00.000Z');
      expect(events.map((e) => e.kind)).toEqual([SagaEventKind.Completed]);
    });

    it('compensates completed steps in reverse order after a business error', async () => {
      const { participant, engineFor, events } = setup();
      participant.script('c.create', business('SOLD_OUT'));

      const result = await engineFor('node-1').start(
        'three-step',
        {},
        { sagaId: 's1' },
      );

      expect(result.status).toBe(SagaStatus.Compensated);
      expect(result.lastErrorCode).toBe('SOLD_OUT');
      expect(participant.removes()).toEqual(['b.remove', 'a.remove']);
      expect(participant.liveResources).toBe(0);
      expect(events.map((e) => e.kind)).toEqual([SagaEventKind.Compensated]);
    });

    it('moves to CompensationFailed when a compensation returns a business error', async () => {
      const { participant, engineFor } = setup();
      participant.script('c.create', business('SOLD_OUT'));
      participant.script('b.remove', business('LOCKED'));

      const result = await engineFor('node-1').start(
        'three-step',
        {},
        { sagaId: 's1' },
      );

      expect(result.status).toBe(SagaStatus.CompensationFailed);
      expect(result.lastErrorCode).toBe('LOCKED');
      expect(participant.removes()).toEqual(['b.remove']);
      expect(participant.liveResources).toBe(2);
    });

    it('suspends on a compensation transient failure and finishes on retry', async () => {
      const { participant, engineFor, clock, recovery } = setup();
      participant.script('c.create', business('SOLD_OUT'));
      participant.script('b.remove', transient());

      const suspended = await engineFor('node-1').start(
        'three-step',
        {},
        { sagaId: 's1' },
      );
      expect(suspended.status).toBe(SagaStatus.Suspended);
      expect(suspended.direction).toBe(StepDirection.Compensate);

      clock.advance(1_000);
      const report = await recovery(engineFor('node-2')).runOnce();
      expect(report.resumed).toEqual(['s1']);
      expect(participant.removes()).toEqual([
        'b.remove',
        'b.remove',
        'a.remove',
      ]);
      expect(participant.liveResources).toBe(0);
    });
  });

  describe('crash and recovery', () => {
    it('re-invokes a dispatched step with the same key after a crash and produces one effect', async () => {
      const { store, clock, participant, engineFor, recovery } = setup();
      let armed = true;
      const crashing = engineFor('node-1', {
        crashAfterDispatch: (index) => {
          if (armed && index === 1) {
            armed = false;
            return true;
          }
          return false;
        },
      });

      await expect(
        crashing.start('three-step', {}, { sagaId: 's1' }),
      ).rejects.toBeInstanceOf(SimulatedCrash);
      expect(participant.operations()).toEqual(['a.create']);

      clock.advance(30_001);
      const report = await recovery(engineFor('node-2')).runOnce();

      expect(report.resumed).toEqual(['s1']);
      const bCalls = participant.calls.filter(
        (call) => call.operationId === 'b.create',
      );
      expect(bCalls.map((call) => call.idempotencyKey)).toEqual([
        's1:1:forward',
      ]);
      expect(participant.effects.get('b.create')).toBe(1);
      expect((await store.get('s1'))?.status).toBe(SagaStatus.Completed);
    });

    it('replays a call whose effect happened before the crash, normalizing the replayed output', async () => {
      const { participant, clock, engineFor, recovery } = setup();
      const crashing = new CrashAfterEffect(participant, 'b.create');

      await expect(
        engineFor('node-1', { invoker: crashing }).start(
          'three-step',
          {},
          { sagaId: 's1' },
        ),
      ).rejects.toBeInstanceOf(SimulatedCrash);
      expect(participant.effects.get('b.create')).toBe(1);

      clock.advance(30_001);
      const report = await recovery(engineFor('node-2')).runOnce();

      expect(report.resumed).toEqual(['s1']);
      const keys = participant.calls
        .filter((call) => call.operationId === 'b.create')
        .map((call) => call.idempotencyKey);
      expect(keys).toEqual(['s1:1:forward', 's1:1:forward']);
      expect(participant.effects.get('b.create')).toBe(1);
      const final = await engineFor('node-3').resume('s1');
      expect((final.state as State).bAt).toBe('1970-01-01T00:00:00.000Z');
    });

    it('refuses to run a saga whose lease another run holds', async () => {
      const { clock, engineFor } = setup();
      let armed = true;
      const crashing = engineFor('node-1', {
        crashAfterDispatch: () => {
          if (armed) {
            armed = false;
            return true;
          }
          return false;
        },
      });
      await expect(
        crashing.start('three-step', {}, { sagaId: 's1' }),
      ).rejects.toBeInstanceOf(SimulatedCrash);

      expect(await codeOf(engineFor('node-2').resume('s1'))).toBe(
        SagaErrorCode.LeaseNotAcquired,
      );

      clock.advance(30_001);
      await expect(engineFor('node-2').resume('s1')).resolves.toMatchObject({
        status: SagaStatus.Completed,
      });
    });

    it('lets only one of two concurrent resumes on the same node run the step', async () => {
      const { participant, clock, engineFor } = setup();
      let armed = true;
      const crashing = engineFor('node-1', {
        crashAfterDispatch: (index) => {
          if (armed && index === 1) {
            armed = false;
            return true;
          }
          return false;
        },
      });
      await expect(
        crashing.start('three-step', {}, { sagaId: 's1' }),
      ).rejects.toBeInstanceOf(SimulatedCrash);
      clock.advance(30_001);

      const worker = engineFor('node-2');
      const outcomes = await Promise.allSettled([
        worker.resume('s1'),
        worker.resume('s1'),
      ]);

      expect(outcomes.filter((o) => o.status === 'fulfilled')).toHaveLength(1);
      const rejected = outcomes.find(
        (o): o is PromiseRejectedResult => o.status === 'rejected',
      );
      expect((rejected?.reason as SagaError).code).toBe(
        SagaErrorCode.LeaseNotAcquired,
      );
      expect(
        participant.calls.filter((c) => c.operationId === 'b.create'),
      ).toHaveLength(1);
      expect(participant.effects.get('b.create')).toBe(1);
    });

    it('rejects the write of a stale run that lost its lease, leaving the log to the new run', async () => {
      const { store, participant, clock, engineFor } = setup();
      const stale = new StaleRunInvoker(participant, 'b.create', async () => {
        clock.advance(30_001);
        await engineFor('node-2').resume('s1');
      });

      const error = await codeOf(
        engineFor('node-1', { invoker: stale }).start(
          'three-step',
          {},
          { sagaId: 's1' },
        ),
      );

      expect(error).toBe(SagaErrorCode.LeaseLost);
      expect(participant.effects.get('b.create')).toBe(1);
      const logged = (await store.steps('s1')).find((e) => e.stepIndex === 1);
      expect(logged?.status).toBe(StepStatus.Succeeded);
      expect((await store.get('s1'))?.status).toBe(SagaStatus.Completed);
    });

    it('stops the run without writing when the lease renewal fails', async () => {
      const { participant, engineFor } = setup();
      const flaky = new FlakyRenewalStore(2);
      const engine = engineFor('node-1', { store: flaky });

      const error = await codeOf(
        engine.start('three-step', {}, { sagaId: 's1' }),
      );

      expect(error).toBe(SagaErrorCode.LeaseLost);
      expect(participant.operations()).toEqual(['a.create']);
      const instance = await flaky.get('s1');
      expect(instance?.currentStep).toBe(1);
      expect(instance?.status).toBe(SagaStatus.Running);
      expect(
        (await flaky.steps('s1')).find((e) => e.stepIndex === 1)?.status,
      ).toBe(StepStatus.Dispatched);
    });
  });

  describe('transient failures and deadlines', () => {
    it('suspends on a transient failure, logs the step as uncertain, and completes on retry', async () => {
      const { store, participant, clock, engineFor, recovery } = setup();
      participant.script('b.create', transient());

      const suspended = await engineFor('node-1').start(
        'three-step',
        {},
        { sagaId: 's1' },
      );

      expect(suspended.status).toBe(SagaStatus.Suspended);
      expect(suspended.lastErrorCode).toBe(SagaErrorCode.TransientFailure);
      expect(suspended.nextAttemptAt?.getTime()).toBe(
        clock.now().getTime() + 1_000,
      );
      expect(
        (await store.steps('s1')).find((e) => e.stepIndex === 1)?.status,
      ).toBe(StepStatus.Uncertain);

      expect((await recovery(engineFor('node-2')).runOnce()).resumed).toEqual(
        [],
      );

      clock.advance(1_000);
      expect((await recovery(engineFor('node-2')).runOnce()).resumed).toEqual([
        's1',
      ]);
      expect((await store.get('s1'))?.status).toBe(SagaStatus.Completed);
      expect(participant.effects.get('b.create')).toBe(1);
    });

    it('suspends when the invoker throws a network error, classified as transient', async () => {
      const { participant, engineFor } = setup();
      participant.script(
        'b.create',
        Object.assign(new Error('socket reset'), { code: 'ECONNRESET' }),
      );

      const suspended = await engineFor('node-1').start(
        'three-step',
        {},
        { sagaId: 's1' },
      );

      expect(suspended.status).toBe(SagaStatus.Suspended);
      expect(suspended.lastErrorCode).toBe(SagaErrorCode.TransientFailure);
    });

    it('compensates an uncertain step, including itself, once the deadline has passed', async () => {
      const { participant, clock, engineFor, recovery } = setup();
      participant.script('b.create', transient());

      const suspended = await engineFor('node-1').start(
        'three-step',
        {},
        { sagaId: 's1', deadlineMs: 5_000 },
      );
      expect(suspended.status).toBe(SagaStatus.Suspended);

      clock.advance(5_000);
      expect((await recovery(engineFor('node-2')).runOnce()).resumed).toEqual([
        's1',
      ]);

      const final = await engineFor('node-2').resume('s1');
      expect(final.status).toBe(SagaStatus.Compensated);
      expect(
        participant.calls.filter((c) => c.operationId === 'b.create'),
      ).toHaveLength(1);
      expect(participant.removes()).toEqual(['b.remove', 'a.remove']);
      expect(participant.liveResources).toBe(0);
    });

    it('checks the deadline before dispatching a step and never calls it past the deadline', async () => {
      const { participant, engineFor } = setup();

      const result = await engineFor('node-1').start(
        'three-step',
        {},
        { sagaId: 's1', deadlineMs: 0 },
      );

      expect(result.status).toBe(SagaStatus.Compensated);
      expect(participant.operations()).toEqual([]);
    });

    it('requires intervention after too many suspension attempts', async () => {
      const { participant, clock, engineFor, recovery, events } = setup();
      participant.script(
        'b.create',
        transient(),
        transient(),
        transient(),
        transient(),
        transient(),
      );
      const engine = engineFor('node-1', { maxSuspendAttempts: 3 });

      await engine.start('three-step', {}, { sagaId: 's1' });
      for (let i = 0; i < 3; i++) {
        clock.advance(61_000);
        await recovery(
          engineFor('node-2', { maxSuspendAttempts: 3 }),
        ).runOnce();
      }

      const final = await engineFor('node-2').resume('s1');
      expect(final.status).toBe(SagaStatus.RequiresIntervention);
      expect(events.map((e) => e.kind)).toContain(
        SagaEventKind.RequiresIntervention,
      );
      expect(events.at(-1)?.lastErrorCode).toBe(SagaErrorCode.TransientFailure);
    });

    it('requires intervention when a suspension outlives the maximum age', async () => {
      const { participant, clock, engineFor, recovery } = setup();
      participant.script('b.create', transient(), transient());
      await engineFor('node-1', { maxSuspendAgeMs: 500 }).start(
        'three-step',
        {},
        { sagaId: 's1' },
      );

      clock.advance(1_000);
      await recovery(engineFor('node-2', { maxSuspendAgeMs: 500 })).runOnce();

      expect(
        (await engineFor('node-2', { maxSuspendAgeMs: 500 }).resume('s1'))
          .status,
      ).toBe(SagaStatus.RequiresIntervention);
    });
  });

  describe('post-pivot and protocol violations', () => {
    it('never compensates a transient failure after the pivot, even past the deadline', async () => {
      const { participant, clock, engineFor, recovery } = setup();
      participant.script('post.send', transient());

      const suspended = await engineFor('node-1').start(
        'pivot-saga',
        {},
        { sagaId: 's1', deadlineMs: 100 },
      );
      expect(suspended.status).toBe(SagaStatus.Suspended);

      clock.advance(1_000);
      await recovery(engineFor('node-2')).runOnce();

      expect((await engineFor('node-2').resume('s1')).status).toBe(
        SagaStatus.Completed,
      );
      expect(participant.removes()).toEqual([]);
    });

    it('requires intervention on a business error after the pivot and never compensates', async () => {
      const { participant, engineFor, recovery, events, clock } = setup();
      participant.script('post.send', business('BAD_ADDRESS'));

      const result = await engineFor('node-1').start(
        'pivot-saga',
        {},
        { sagaId: 's1' },
      );

      expect(result.status).toBe(SagaStatus.RequiresIntervention);
      expect(result.lastErrorCode).toBe('BAD_ADDRESS');
      expect(participant.removes()).toEqual([]);
      expect(participant.liveResources).toBe(1);
      expect(events.map((e) => e.kind)).toEqual([
        SagaEventKind.RequiresIntervention,
      ]);

      clock.advance(60_000);
      expect((await recovery(engineFor('node-2')).runOnce()).resumed).toEqual(
        [],
      );
    });

    it('compensates a protocol violation before the pivot, including the current step, and alerts', async () => {
      const { participant, engineFor, events } = setup();
      participant.script('b.create', protocol());

      const result = await engineFor('node-1').start(
        'three-step',
        {},
        { sagaId: 's1' },
      );

      expect(result.status).toBe(SagaStatus.Compensated);
      expect(result.lastErrorCode).toBe(SagaErrorCode.ProtocolViolation);
      expect(participant.removes()).toEqual(['b.remove', 'a.remove']);
      expect(events.map((e) => e.kind)).toEqual([
        SagaEventKind.ProtocolViolation,
        SagaEventKind.Compensated,
      ]);
    });

    it('requires intervention on a protocol violation after the pivot', async () => {
      const { participant, engineFor, events } = setup();
      participant.script('post.send', protocol());

      const result = await engineFor('node-1').start(
        'pivot-saga',
        {},
        { sagaId: 's1' },
      );

      expect(result.status).toBe(SagaStatus.RequiresIntervention);
      expect(result.lastErrorCode).toBe(SagaErrorCode.ProtocolViolation);
      expect(events.map((e) => e.kind)).toEqual([
        SagaEventKind.ProtocolViolation,
        SagaEventKind.RequiresIntervention,
      ]);
    });

    it('moves to CompensationFailed on a protocol violation during compensation, and alerts', async () => {
      const { participant, engineFor, events } = setup();
      participant.script('c.create', business('SOLD_OUT'));
      participant.script('b.remove', protocol());

      const result = await engineFor('node-1').start(
        'three-step',
        {},
        { sagaId: 's1' },
      );

      expect(result.status).toBe(SagaStatus.CompensationFailed);
      expect(result.lastErrorCode).toBe(SagaErrorCode.ProtocolViolation);
      expect(participant.removes()).toEqual(['b.remove']);
      expect(events.map((e) => e.kind)).toContain(
        SagaEventKind.ProtocolViolation,
      );
    });
  });

  describe('state, events and configuration', () => {
    it('requires intervention when onSuccess throws, and logs the step as succeeded', async () => {
      const { store, engineFor } = setup();

      const result = await engineFor('node-1').start(
        'throwing',
        {},
        { sagaId: 's1' },
      );

      expect(result.status).toBe(SagaStatus.RequiresIntervention);
      expect(result.lastErrorCode).toBe(SagaErrorCode.StateUpdateFailed);
      expect((await store.steps('s1'))[0].status).toBe(StepStatus.Succeeded);
    });

    it('ignores listeners that throw or reject', async () => {
      const { engineFor } = setup();
      const engine = engineFor('node-1');
      engine.onEvent(() => {
        throw new Error('sync listener');
      });
      engine.onEvent(() => Promise.reject(new Error('async listener')));

      await expect(
        engine.start('three-step', {}, { sagaId: 's1' }),
      ).resolves.toMatchObject({
        status: SagaStatus.Completed,
      });
    });

    it('returns the existing instance for an idempotency key without running again', async () => {
      const { participant, engineFor } = setup();
      const engine = engineFor('node-1');

      const first = await engine.start(
        'three-step',
        {},
        { idempotencyKey: 'order-1' },
      );
      const second = await engine.start(
        'three-step',
        {},
        { idempotencyKey: 'order-1' },
      );

      expect(second.id).toBe(first.id);
      expect(second.status).toBe(SagaStatus.Completed);
      expect(participant.operations()).toHaveLength(3);
    });

    it('rejects state that does not round-trip through JSON', async () => {
      const { engineFor } = setup();

      expect(
        await codeOf(
          engineFor('node-1').start('three-step', { seen: new Map() }),
        ),
      ).toBe(SagaErrorCode.InvalidState);
      expect(
        await codeOf(
          engineFor('node-1').start('three-step', { when: new Date() }),
        ),
      ).toBe(SagaErrorCode.InvalidState);
    });

    it('rejects a lease that is not longer than the maximum step duration', async () => {
      const { store, participant, registry, clock } = setup();
      const build = () =>
        new SagaEngine({
          store,
          invoker: participant,
          registry,
          owner: 'node-1',
          clock,
          leaseMs: 20_000,
          maxStepDurationMs: 25_000,
        });

      await expect(codeOf(Promise.resolve().then(build))).resolves.toBe(
        SagaErrorCode.InvalidConfiguration,
      );
    });

    it('compiles every saga when it is built, not with the first saga of each type', async () => {
      const { store, participant, clock } = setup();
      class Empty extends SagaDefinition<State> {
        readonly type = 'empty';

        protected define(): void {
          // no steps
        }
      }
      const build = () =>
        new SagaEngine({
          store,
          invoker: participant,
          registry: new Map([
            ['empty', new Empty() as SagaDefinition<unknown>],
          ]),
          owner: 'node-1',
          clock,
        });

      await expect(codeOf(Promise.resolve().then(build))).resolves.toBe(
        SagaErrorCode.InvalidDefinition,
      );
    });

    it('skips read-only steps while compensating', async () => {
      const { store, participant, clock } = setup();
      const Lookup = defineOperation({
        id: 'a.lookup.v1',
        input: z.object({}),
        output: z.object({}),
        idempotent: true,
        mutating: false,
        description: 'Reads, nothing to undo.',
      });
      class WithLookup extends SagaDefinition<State> {
        readonly type = 'with-lookup';

        protected define(flow: SagaFlow<State>): void {
          flow
            .step(STEP_A)
            .input(() => ({ name: 'a' }))
            .onSuccess((s, out) => {
              s.a = out.id;
            })
            .compensationInput((s) => ({ id: s.a }))
            .step(Lookup)
            .input(() => ({}))
            .step(STEP_C)
            .input(() => ({ name: 'c' }));
        }
      }
      participant.script('c.create', business('SOLD_OUT'));
      const engine = new SagaEngine({
        store,
        invoker: participant,
        registry: new Map([
          ['with-lookup', new WithLookup() as SagaDefinition<unknown>],
        ]),
        owner: 'node-1',
        clock,
      });

      const result = await engine.start('with-lookup', {}, { sagaId: 's1' });

      expect(result.status).toBe(SagaStatus.Compensated);
      expect(participant.operations()).toEqual([
        'a.create',
        'a.lookup.v1',
        'c.create',
        'a.remove',
      ]);
    });

    it('rejects an unknown saga type', async () => {
      const { engineFor } = setup();

      expect(await codeOf(engineFor('node-1').start('unknown', {}))).toBe(
        SagaErrorCode.UnknownDefinition,
      );
    });
  });

  describe('recovery isolation', () => {
    it('records a failing saga and keeps resuming the rest of the batch', async () => {
      const { store, participant, clock, engineFor, recovery } = setup();
      participant.script('b.create', transient());
      await engineFor('node-1').start('three-step', {}, { sagaId: 'good' });
      await store.create(
        instanceRecord({ id: 'ghost', status: SagaStatus.Running }),
      );
      clock.advance(1_000);

      const report = await recovery(engineFor('node-2')).runOnce();

      expect(report.resumed).toEqual(['good']);
      expect(report.failed).toEqual([
        { sagaId: 'ghost', errorCode: SagaErrorCode.UnknownDefinition },
      ]);
    });

    it('reports an unexpected error with the catalog code PLATFORM.INTERNAL.UNEXPECTED', async () => {
      const { clock, engineFor, participant, recovery } = setup();
      participant.script('b.create', transient());
      await engineFor('node-1').start('three-step', {}, { sagaId: 's1' });
      clock.advance(1_000);
      const engine = engineFor('node-2');
      jest.spyOn(engine, 'resume').mockRejectedValueOnce(new Error('boom'));

      const report = await recovery(engine).runOnce();

      expect(report.failed).toEqual([
        { sagaId: 's1', errorCode: PlatformErrorCode.InternalUnexpected },
      ]);
    });
  });
  describe('retries reuse the logged input', () => {
    it('re-dispatches an uncertain forward step with the logged input and the same key', async () => {
      const { participant, clock, counts, engineFor, recovery } = setup();
      participant.script('b.create', transient());

      await engineFor('node-1').start('volatile', {}, { sagaId: 's1' });
      clock.advance(1_000);
      expect((await recovery(engineFor('node-2')).runOnce()).resumed).toEqual([
        's1',
      ]);

      const bCalls = participant.calls.filter(
        (c) => c.operationId === 'b.create',
      );
      expect(bCalls).toHaveLength(2);
      expect(bCalls[1].input).toEqual(bCalls[0].input);
      expect(bCalls.map((c) => c.idempotencyKey)).toEqual([
        's1:1:forward',
        's1:1:forward',
      ]);
      expect(counts.inputs).toBe(1);
    });

    it('re-dispatches an uncertain compensation with the logged input', async () => {
      const { participant, clock, counts, engineFor, recovery } = setup();
      participant.script('c.create', business('SOLD_OUT'));
      participant.script('b.remove', transient());

      const suspended = await engineFor('node-1').start(
        'volatile',
        {},
        { sagaId: 's1' },
      );
      expect(suspended.status).toBe(SagaStatus.Suspended);
      clock.advance(1_000);
      await recovery(engineFor('node-2')).runOnce();

      const removes = participant.calls.filter(
        (c) => c.operationId === 'b.remove',
      );
      expect(removes).toHaveLength(2);
      expect(removes[1].input).toEqual(removes[0].input);
      expect(counts.compensations).toBe(1);
      expect((await engineFor('node-2').resume('s1')).status).toBe(
        SagaStatus.Compensated,
      );
    });
  });

  describe('input and state validation', () => {
    it.each(['input-bigint', 'input-throws', 'input-cycle'])(
      'requires intervention when the input of %s cannot be built',
      async (type) => {
        const { participant, engineFor, events } = setup();

        const result = await engineFor('node-1').start(
          type,
          {},
          { sagaId: 's1' },
        );

        expect(result.status).toBe(SagaStatus.RequiresIntervention);
        expect(result.lastErrorCode).toBe(SagaErrorCode.InputBuildFailed);
        expect(participant.operations()).toEqual([]);
        expect(events.map((e) => e.kind)).toEqual([
          SagaEventKind.RequiresIntervention,
        ]);
      },
    );

    it('requires intervention when a compensation input cannot be built', async () => {
      const { participant, engineFor } = setup();
      participant.script('c.create', business('SOLD_OUT'));

      const result = await engineFor('node-1').start(
        'comp-input-throws',
        {},
        { sagaId: 's1' },
      );

      expect(result.status).toBe(SagaStatus.RequiresIntervention);
      expect(result.lastErrorCode).toBe(SagaErrorCode.InputBuildFailed);
      expect(participant.removes()).toEqual([]);
      expect(participant.liveResources).toBe(1);
    });

    it('requires intervention when onSuccess leaves a non-serializable value in the state', async () => {
      const { engineFor } = setup();

      const result = await engineFor('node-1').start(
        'date-state',
        {},
        { sagaId: 's1' },
      );

      expect(result.status).toBe(SagaStatus.RequiresIntervention);
      expect(result.lastErrorCode).toBe(SagaErrorCode.StateUpdateFailed);
    });
  });

  describe('call timeouts', () => {
    it('treats a call that exceeds maxStepDurationMs as uncertain, aborts it and retries it later', async () => {
      const { participant, clock, engineFor, store, recovery } = setup();
      const hanging = new HangingInvoker(participant, 'b.create');
      const engine = engineFor('node-1', {
        invoker: hanging,
        leaseMs: 1_000,
        maxStepDurationMs: 100,
      });

      const suspended = await engine.start('three-step', {}, { sagaId: 's1' });

      expect(suspended.status).toBe(SagaStatus.Suspended);
      expect(suspended.lastErrorCode).toBe(SagaErrorCode.UncertainOutcome);
      expect(hanging.signals[0]?.aborted).toBe(true);
      expect(
        (await store.steps('s1')).find((e) => e.stepIndex === 1)?.status,
      ).toBe(StepStatus.Uncertain);

      clock.advance(1_000);
      expect((await recovery(engineFor('node-2')).runOnce()).resumed).toEqual([
        's1',
      ]);
      expect((await store.get('s1'))?.status).toBe(SagaStatus.Completed);
    });

    it('clears the call timer once the call settles', async () => {
      const { engineFor } = setup();
      const spy = jest.spyOn(globalThis, 'clearTimeout');
      try {
        await engineFor('node-1').start('three-step', {}, { sagaId: 's1' });

        expect(spy.mock.calls.some(([timer]) => timer !== undefined)).toBe(
          true,
        );
      } finally {
        spy.mockRestore();
      }
    });
  });

  describe('events and idempotency', () => {
    it('emits nothing when resuming a saga that is already finished', async () => {
      const { events, engineFor } = setup();
      await engineFor('node-1').start('three-step', {}, { sagaId: 's1' });
      events.splice(0);

      const result = await engineFor('node-2').resume('s1');

      expect(result.status).toBe(SagaStatus.Completed);
      expect(events).toEqual([]);
    });

    it('emits nothing when a retry leaves the saga suspended', async () => {
      const { participant, clock, events, engineFor } = setup();
      participant.script('b.create', transient(), transient());
      await engineFor('node-1').start('three-step', {}, { sagaId: 's1' });
      expect(events.map((e) => e.kind)).toEqual([SagaEventKind.Suspended]);
      events.splice(0);

      clock.advance(1_000);
      const result = await engineFor('node-2').resume('s1');

      expect(result.status).toBe(SagaStatus.Suspended);
      expect(events).toEqual([]);
    });

    it('rejects an idempotency key that belongs to another saga type', async () => {
      const { engineFor } = setup();
      await engineFor('node-1').start(
        'three-step',
        {},
        { idempotencyKey: 'k1' },
      );

      expect(
        await codeOf(
          engineFor('node-1').start('pivot-saga', {}, { idempotencyKey: 'k1' }),
        ),
      ).toBe(SagaErrorCode.IdempotencyKeyConflict);
    });
  });
  describe('call outcomes, budgets and context', () => {
    it('suspends on an uncertain outcome and retries with the same key and input until it completes', async () => {
      const { participant, clock, engineFor, recovery, store } = setup();
      participant.script('b.create', CallOutcome.uncertain('timeout'));

      const suspended = await engineFor('node-1').start(
        'three-step',
        {},
        { sagaId: 's1' },
      );
      expect(suspended.status).toBe(SagaStatus.Suspended);
      expect(suspended.lastErrorCode).toBe(SagaErrorCode.UncertainOutcome);
      expect(
        (await store.steps('s1')).find((e) => e.stepIndex === 1)?.status,
      ).toBe(StepStatus.Uncertain);

      clock.advance(1_000);
      await recovery(engineFor('node-2')).runOnce();

      expect((await store.get('s1'))?.status).toBe(SagaStatus.Completed);
      const calls = participant.calls.filter(
        (call) => call.operationId === 'b.create',
      );
      expect(calls.map((call) => call.idempotencyKey)).toEqual([
        's1:1:forward',
        's1:1:forward',
      ]);
      expect(calls[1]?.input).toEqual(calls[0]?.input);
    });

    it('requires intervention when uncertain outcomes exhaust the retry budget', async () => {
      const { participant, clock, engineFor } = setup();
      participant.script(
        'b.create',
        CallOutcome.uncertain('timeout'),
        CallOutcome.uncertain('timeout'),
      );
      const engine = () => engineFor('node-1', { maxSuspendAttempts: 1 });

      await engine().start('three-step', {}, { sagaId: 's1' });
      clock.advance(61_000);
      const final = await engine().resume('s1');

      expect(final.status).toBe(SagaStatus.RequiresIntervention);
      expect(final.lastErrorCode).toBe(SagaErrorCode.UncertainOutcome);
    });

    it('suspends an uncertain compensation and finishes it on retry', async () => {
      const { participant, clock, engineFor } = setup();
      participant.script('c.create', business('C.CREATE.REJECTED'));
      participant.script('b.remove', CallOutcome.uncertain('timeout'));

      const suspended = await engineFor('node-1').start(
        'three-step',
        {},
        { sagaId: 's1' },
      );
      expect(suspended.status).toBe(SagaStatus.Suspended);
      expect(suspended.direction).toBe(StepDirection.Compensate);
      expect(suspended.lastErrorCode).toBe(SagaErrorCode.UncertainOutcome);

      clock.advance(1_000);
      const final = await engineFor('node-2').resume('s1');
      expect(final.status).toBe(SagaStatus.Compensated);
    });

    it('classifies an unknown thrown error as a protocol violation and compensates', async () => {
      const { participant, engineFor } = setup();
      participant.script('b.create', new Error('undefined is not a function'));

      const result = await engineFor('node-1').start(
        'three-step',
        {},
        { sagaId: 's1' },
      );

      expect(result.status).toBe(SagaStatus.Compensated);
      expect(result.lastErrorCode).toBe(SagaErrorCode.ProtocolViolation);
    });

    it('treats an invoker result of unknown shape as a protocol violation', async () => {
      const { participant, engineFor } = setup();
      participant.script('b.create', {
        kind: 'mystery',
      } as unknown as InvokeResult);

      const result = await engineFor('node-1').start(
        'three-step',
        {},
        { sagaId: 's1' },
      );

      expect(result.lastErrorCode).toBe(SagaErrorCode.ProtocolViolation);
    });

    it('still accepts results from a legacy invoker', async () => {
      const { store, registry, clock } = setup();
      const legacy: OperationInvoker = {
        invoke: async (operationId: string) =>
          operationId === 'b.create'
            ? { kind: InvokeKind.BusinessError, code: 'B.CREATE.REJECTED' }
            : { kind: InvokeKind.Success, output: { id: 'x', at: 'now' } },
      };
      const engine = new SagaEngine({
        store,
        invoker: legacy,
        registry,
        owner: 'node-1',
        clock,
      });

      const result = await engine.start('three-step', {}, { sagaId: 's1' });

      expect(result.status).toBe(SagaStatus.Compensated);
      expect(result.lastErrorCode).toBe('B.CREATE.REJECTED');
    });

    it('hands each call one step deadline and renews the lease past it', async () => {
      const { participant, clock, engineFor, store } = setup();
      const renew = jest.spyOn(store, 'renewLease');
      const start = clock.now().getTime();

      await engineFor('node-1', {
        leaseMs: 5_000,
        maxStepDurationMs: 2_000,
      }).start('three-step', {}, { sagaId: 's1' });

      const deadline = participant.calls[0]?.options?.deadline;
      expect(deadline?.atMs).toBe(start + 2_000);
      expect(participant.calls[0]?.options?.signal).toBeInstanceOf(AbortSignal);
      expect(renew.mock.calls[0]?.[2].getTime()).toBe(start + 5_000);
    });

    it('persists the call context and sends it on every step, also after recovery', async () => {
      const { participant, clock, engineFor, recovery, store } = setup();
      const context = {
        tenantId: 't-1',
        actorId: 'u-1',
        traceparent: '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
      };
      let armed = true;
      const crashing = engineFor('node-1', {
        crashAfterDispatch: (index) => {
          if (armed && index === 1) {
            armed = false;
            return true;
          }
          return false;
        },
      });

      await expect(
        crashing.start('three-step', {}, { sagaId: 's1', context }),
      ).rejects.toBeInstanceOf(SimulatedCrash);
      expect((await store.get('s1'))?.context).toEqual(context);

      clock.advance(30_001);
      await recovery(engineFor('node-2')).runOnce();

      expect((await store.get('s1'))?.status).toBe(SagaStatus.Completed);
      expect(participant.calls).toHaveLength(3);
      for (const call of participant.calls) {
        expect(call.options?.context).toEqual(context);
      }
    });

    it('stores no context when none is given and sends an empty one', async () => {
      const { participant, engineFor, store } = setup();

      await engineFor('node-1').start('three-step', {}, { sagaId: 's1' });

      expect((await store.get('s1'))?.context).toBeNull();
      expect(participant.calls[0]?.options?.context).toEqual({});
    });
  });

  describe('idempotent start', () => {
    it('returns the existing instance when the key and the input match, in any key order', async () => {
      const { participant, engineFor } = setup();
      const engine = engineFor('node-1');

      const first = await engine.start(
        'three-step',
        { a: 'x', b: 'y' },
        { idempotencyKey: 'order-1' },
      );
      const second = await engine.start(
        'three-step',
        { b: 'y', a: 'x' },
        { idempotencyKey: 'order-1' },
      );

      expect(second.id).toBe(first.id);
      expect(participant.operations()).toHaveLength(3);
    });

    it('rejects the same key with a different input', async () => {
      const { participant, engineFor } = setup();
      const engine = engineFor('node-1');
      await engine.start('three-step', { a: 'x' }, { idempotencyKey: 'k1' });

      expect(
        await codeOf(
          engine.start('three-step', { a: 'other' }, { idempotencyKey: 'k1' }),
        ),
      ).toBe(SagaErrorCode.IdempotencyKeyConflict);
      expect(participant.operations()).toHaveLength(3);
    });

    it('stores the input digest with the instance', async () => {
      const { engineFor, store } = setup();
      await engineFor('node-1').start(
        'three-step',
        { a: 'x' },
        { sagaId: 's1', idempotencyKey: 'k1' },
      );

      expect((await store.get('s1'))?.inputDigest).toBe(
        stableDigest({ a: 'x' }),
      );
    });

    it('accepts an instance stored before digests existed', async () => {
      const { engineFor, store } = setup();
      await store.create(
        instanceRecord({
          id: 'old',
          type: 'three-step',
          idempotencyKey: 'k-old',
          status: SagaStatus.Completed,
        }),
      );

      const reused = await engineFor('node-1').start(
        'three-step',
        { anything: true },
        { idempotencyKey: 'k-old' },
      );

      expect(reused.id).toBe('old');
    });
  });

  describe('platform conventions', () => {
    it('generates saga ids and lease tokens with the IdGenerator port', async () => {
      const { engineFor, store } = setup();
      const ids = new SequentialIdGenerator();
      const acquire = jest.spyOn(store, 'releaseLease');

      const result = await engineFor('node-1', { ids }).start('three-step', {});

      expect(result.id).toBe('01941f29-7c00-7000-8000-000000000001');
      expect(acquire.mock.calls[0]?.[1]).toBe(
        'node-1:01941f29-7c00-7000-8000-000000000002',
      );
    });

    it('raises errors that extend PlatformError, retryable only for contention', () => {
      const lost = new SagaError(SagaErrorCode.LeaseLost, 'lost');
      const invalid = new SagaError(SagaErrorCode.InvalidState, 'bad');

      expect(lost).toBeInstanceOf(PlatformError);
      expect(lost.retryable).toBe(true);
      expect(invalid.retryable).toBe(false);
      expect(new SimulatedCrash('x').name).toBe('SimulatedCrash');
    });
  });
});
