import { CallOutcome, Deadline } from '@platform/primitives';
import { SagaErrorCode } from '../../errors/saga-error-code.enum.js';
import { SagaError } from '../../errors/saga-error.js';
import {
  CrashingSagaStore,
  ProcessDied,
} from '../../__tests__/utils/crashing-saga-store.js';
import { FakeParticipant } from '../../__tests__/utils/fake-participant.js';
import { InMemorySagaStore } from '../../__tests__/utils/in-memory-saga-store.js';
import { SagaEngineKit } from '../../__tests__/utils/saga-engine-kit.js';
import type { InvokeOptions } from '../../invoker/invoke-options.js';
import { OperationInvoker } from '../../invoker/operation-invoker.js';
import { ThreeStepSaga } from '../../__tests__/utils/sample-sagas.js';
import { SagaStatus } from '../../model/saga-status.enum.js';
import { StepStatus } from '../../model/step-status.enum.js';

/** Beyond the default 30 s lease: the crashed process no longer renews it. */
const LEASE_EXPIRED_MS = 30_001;

/** Store that loses the lease on the given renewal call. */
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

/** Store that records the date until which each lease is renewed. */
class RenewalRecordingStore extends InMemorySagaStore {
  readonly renewals: Date[] = [];

  override async renewLease(
    id: string,
    token: string,
    until: Date,
  ): Promise<boolean> {
    this.renewals.push(until);
    return super.renewLease(id, token, until);
  }
}

/** Invoker that records the deadline and context of each call. */
class RecordingInvoker extends FakeParticipant {
  readonly deadlines: (Deadline | undefined)[] = [];

  override async invoke(
    operationId: string,
    input: unknown,
    key: string,
    options?: InvokeOptions,
  ) {
    this.deadlines.push(options?.deadline);
    return super.invoke(operationId, input, key, options);
  }
}

/** Invoker that does not respond until its signal is aborted and stores that signal. */
class HangingInvoker extends OperationInvoker {
  readonly signals: AbortSignal[] = [];

  invoke(
    _operationId: string,
    _input: unknown,
    _key: string,
    options?: InvokeOptions,
  ): Promise<CallOutcome<unknown>> {
    if (options?.signal !== undefined) {
      this.signals.push(options.signal);
    }
    return new Promise<CallOutcome<unknown>>(() => undefined);
  }
}

/** Invoker that returns something that is not a call result. */
class BrokenInvoker extends OperationInvoker {
  invoke(): Promise<CallOutcome<unknown>> {
    return Promise.resolve({} as CallOutcome<unknown>);
  }
}

describe('StepCaller', () => {
  it('pierde el lease sin escribir cuando la renovación falla antes de la llamada', async () => {
    const store = new FlakyRenewalStore(2);
    const participant = new FakeParticipant();
    const kit = new SagaEngineKit({
      invoker: participant,
      definitions: [new ThreeStepSaga()],
      store,
    });

    const error: unknown = await kit.sagas
      .start(ThreeStepSaga, {}, { sagaId: 's1' })
      .catch((caught: unknown) => caught);

    expect((error as SagaError).code).toBe(SagaErrorCode.LeaseLost);
    expect(participant.operations()).toEqual(['a.create.v1']);
    const instance = await store.get('s1');
    expect(instance?.currentStep).toBe(1);
    expect(instance?.status).toBe(SagaStatus.Running);
    expect(
      (await store.steps('s1')).find((e) => e.stepIndex === 1)?.status,
    ).toBe(StepStatus.Dispatched);
  });

  it('reinvoca una entrada Dispatched tal cual, sin volver a despacharla', async () => {
    const store = new CrashingSagaStore();
    const participant = new FakeParticipant();
    const kit = new SagaEngineKit({
      invoker: participant,
      definitions: [new ThreeStepSaga()],
      store,
    });
    store.crashAfterDispatch(1);
    await expect(
      kit.sagas.start(ThreeStepSaga, {}, { sagaId: 's1' }),
    ).rejects.toBeInstanceOf(ProcessDied);
    const dispatched = (await store.steps('s1')).find(
      (entry) => entry.stepIndex === 1,
    );

    kit.clock.advance(LEASE_EXPIRED_MS);
    await kit.engineFor('node-b').resume('s1');

    const settled = (await store.steps('s1')).find(
      (entry) => entry.stepIndex === 1,
    );
    expect(settled?.status).toBe(StepStatus.Succeeded);
    expect(settled?.startedAt).toEqual(dispatched?.startedAt);
    expect(settled?.input).toEqual(dispatched?.input);
    expect(participant.keysOf('b.create.v1')).toEqual([
      dispatched?.idempotencyKey,
    ]);
  });

  it('aborta la llamada al vencer su plazo, la deja incierta y reintenta después', async () => {
    const invoker = new HangingInvoker();
    const kit = new SagaEngineKit({
      invoker,
      definitions: [new ThreeStepSaga()],
      settings: { maxStepDurationMs: 100, leaseMs: 1_000 },
    });

    const suspended = await kit.sagas.start(
      ThreeStepSaga,
      {},
      { sagaId: 's1' },
    );

    expect(suspended.status).toBe(SagaStatus.Suspended);
    expect(suspended.lastErrorDetail).toBe('timed out after 100 ms');
    expect(invoker.signals).toHaveLength(1);
    expect(invoker.signals[0]?.aborted).toBe(true);
    const logged = (await kit.store.steps('s1')).find((e) => e.stepIndex === 0);
    expect(logged?.status).toBe(StepStatus.Uncertain);
  });

  it('renueva el lease más allá del plazo del paso y pasa el plazo a la llamada', async () => {
    const store = new RenewalRecordingStore();
    const invoker = new RecordingInvoker();
    const kit = new SagaEngineKit({
      invoker,
      definitions: [new ThreeStepSaga()],
      store,
    });
    const start = kit.clock.now().getTime();

    await kit.sagas.start(ThreeStepSaga, {}, { sagaId: 's1' });

    expect(store.renewals[0]?.getTime()).toBe(start + 30_000);
    expect(invoker.deadlines[0]?.atMs).toBe(start + 25_000);
  });

  it('clasifica un resultado de forma desconocida como violación de protocolo', async () => {
    const kit = new SagaEngineKit({
      invoker: new BrokenInvoker(),
      definitions: [new ThreeStepSaga()],
    });

    const result = await kit.sagas.start(ThreeStepSaga, {}, { sagaId: 's1' });

    expect(result.status).toBe(SagaStatus.CompensationFailed);
    expect(result.lastErrorCode).toBe(SagaErrorCode.ProtocolViolation);
    expect(result.lastErrorDetail).toBe('invalid-invoker-result');
  });

  it('manda el contexto guardado en cada paso y lo conserva tras una recuperación', async () => {
    const participant = new FakeParticipant();
    const kit = new SagaEngineKit({
      invoker: participant,
      definitions: [new ThreeStepSaga()],
    });
    participant.script('b.create.v1', CallOutcome.transientFailure('timeout'));
    const context = { tenantId: 't1', actorId: 'u1' };

    await kit.sagas.start(ThreeStepSaga, {}, { sagaId: 's1', context });
    kit.clock.advance(1_000);
    await kit.engineFor('node-b').resume('s1');

    expect(participant.calls.map((c) => c.context)).toEqual([
      context,
      context,
      context,
      context,
    ]);
  });

  it('envía un contexto vacío cuando no se da ninguno', async () => {
    const participant = new FakeParticipant();
    const kit = new SagaEngineKit({
      invoker: participant,
      definitions: [new ThreeStepSaga()],
    });

    await kit.sagas.start(ThreeStepSaga, {}, { sagaId: 's1' });

    expect(
      participant.calls.every((c) => Object.keys(c.context ?? {}).length === 0),
    ).toBe(true);
  });
});
