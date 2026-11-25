import { CallOutcome } from '@platform/primitives';
import { SagaErrorCode } from '../../errors/saga-error-code.enum.js';
import { FakeParticipant } from '../../__tests__/utils/fake-participant.js';
import { SagaEngineKit } from '../../__tests__/utils/saga-engine-kit.js';
import {
  BigIntInputSaga,
  CyclicInputSaga,
  DateStateSaga,
  PivotSaga,
  ProgressSaga,
  ThreeStepSaga,
  ThrowingInputSaga,
  ThrowingSaga,
  VolatileSaga,
} from '../../__tests__/utils/sample-sagas.js';
import { SagaEventKind } from '../../model/saga-event-kind.enum.js';
import { SagaStatus } from '../../model/saga-status.enum.js';
import { StepStatus } from '../../model/step-status.enum.js';
import { StepDirection } from '../../model/step-direction.enum.js';
import type { SagaSettingsInput } from '../saga-settings-input.js';
import type { SagaDefinition } from '../../definition/saga-definition.js';
import { SagaSettings } from '../saga-settings.js';
import { FixedRandomSource } from '@platform/kernel/test-utils';
import { FailureKind, PlatformError } from '@platform/kernel';

/** Network error that the classifier treats as transient. */
class NetworkError extends PlatformError {
  override readonly code = 'NET.RESET';

  constructor() {
    super('connection reset', { failureKind: FailureKind.Transient });
  }
}

function setup(
  settings: Partial<SagaSettingsInput> = {},
  definitions: SagaDefinition<unknown>[] = [
    new ThreeStepSaga(),
    new PivotSaga(),
  ],
) {
  const participant = new FakeParticipant();
  const kit = new SagaEngineKit({
    invoker: participant,
    definitions,
    settings,
  });
  const events: SagaEventKind[] = [];
  kit.events.subscribe((event) => {
    events.push(event.kind);
  });
  return { kit, participant, events, store: kit.store };
}

describe('StepExecutor', () => {
  describe('transient failures and deadlines', () => {
    it('suspends on a transient failure, leaves the step uncertain and completes on retry', async () => {
      const { kit, participant, store } = setup();
      participant.script(
        'b.create.v1',
        CallOutcome.transientFailure('timeout'),
      );

      const suspended = await kit.sagas.start(
        ThreeStepSaga,
        {},
        { sagaId: 's1' },
      );
      expect(suspended.status).toBe(SagaStatus.Suspended);
      expect(
        (await store.steps('s1')).find((e) => e.stepIndex === 1)?.status,
      ).toBe(StepStatus.Uncertain);

      kit.clock.advance(1_000);
      const resumed = await kit.engineFor('node-b').resume('s1');

      expect(resumed.status).toBe(SagaStatus.Completed);
      expect(resumed.lastErrorDetail).toBeNull();
      expect(
        participant.calls
          .filter((c) => c.operationId === 'b.create.v1')
          .map((c) => c.idempotencyKey),
      ).toEqual(['s1:1:forward', 's1:1:forward']);
    });

    it('uses the backoff formula with equal jitter when retrying', async () => {
      const { kit, participant, store } = setup();
      participant.script(
        'b.create.v1',
        CallOutcome.transientFailure('timeout'),
      );

      await kit.sagas.start(ThreeStepSaga, {}, { sagaId: 's1' });

      const instance = await store.get('s1');
      expect(kit.settings.suspendPolicy().backoff(1)).toBe(750);
      expect(instance?.nextAttemptAt?.getTime()).toBe(
        kit.clock.now().getTime() + 750,
      );
    });

    it('treats a transient error thrown by the invoker as a suspension', async () => {
      const { kit, participant } = setup();
      participant.script('b.create.v1', new NetworkError());

      const result = await kit.sagas.start(ThreeStepSaga, {}, { sagaId: 's1' });

      expect(result.status).toBe(SagaStatus.Suspended);
      expect(result.lastErrorCode).toBe(SagaErrorCode.TransientFailure);
    });

    it('compensates an uncertain step, including itself, when the deadline has passed', async () => {
      const { kit, participant } = setup();
      participant.script(
        'b.create.v1',
        CallOutcome.transientFailure('timeout'),
      );

      await kit.sagas.start(
        ThreeStepSaga,
        {},
        {
          sagaId: 's1',
          deadlineMs: 500,
        },
      );
      kit.clock.advance(1_000);
      const result = await kit.engineFor('node-b').resume('s1');

      expect(result.status).toBe(SagaStatus.Compensated);
      expect(result.lastErrorCode).toBe(SagaErrorCode.DeadlineExceeded);
      expect(participant.removes()).toEqual(['b.remove.v1', 'a.remove.v1']);
    });

    it('dispatches no step before the pivot if the deadline had passed at start', async () => {
      const { kit, participant } = setup();

      const result = await kit.sagas.start(
        ThreeStepSaga,
        {},
        {
          sagaId: 's1',
          deadlineMs: 0,
        },
      );

      expect(result.status).toBe(SagaStatus.Compensated);
      expect(result.lastErrorCode).toBe(SagaErrorCode.DeadlineExceeded);
      expect(participant.calls).toEqual([]);
    });

    it('requires intervention when the number of suspension attempts is exceeded', async () => {
      const { kit, participant } = setup({ maxSuspendAttempts: 2 });
      participant.script(
        'b.create.v1',
        ...[1, 2, 3].map(() => CallOutcome.transientFailure('timeout')),
      );
      await kit.sagas.start(ThreeStepSaga, {}, { sagaId: 's1' });

      kit.clock.advance(2_000);
      await kit.engineFor('node-b').resume('s1');
      kit.clock.advance(10_000);
      const exhausted = await kit.engineFor('node-b').resume('s1');

      expect(exhausted.status).toBe(SagaStatus.RequiresIntervention);
      expect(exhausted.nextAttemptAt).toBeNull();
    });

    it('requires intervention when the suspension exceeds the maximum age', async () => {
      const { kit, participant } = setup({ maxSuspendAgeMs: 500 });
      participant.script(
        'b.create.v1',
        CallOutcome.transientFailure('timeout'),
        CallOutcome.transientFailure('timeout'),
      );
      await kit.sagas.start(ThreeStepSaga, {}, { sagaId: 's1' });

      kit.clock.advance(1_000);
      const result = await kit.engineFor('node-b').resume('s1');

      expect(result.status).toBe(SagaStatus.RequiresIntervention);
    });
  });

  describe('steps that advance in rounds', () => {
    it('repeats a pending round without spending suspensions and completes when it finishes', async () => {
      const { kit, participant } = setup({ maxSuspendAttempts: 2 }, [
        new ProgressSaga(),
      ]);
      participant.script(
        'b.create.v1',
        ...Array.from({ length: 5 }, () =>
          CallOutcome.transientFailure(ProgressSaga.ROUND_PENDING),
        ),
      );
      let result = await kit.sagas.start(ProgressSaga, {}, { sagaId: 's1' });

      for (let round = 0; round < 5; round += 1) {
        expect(result.status).toBe(SagaStatus.Suspended);
        expect(result.attempts).toBe(0);
        kit.clock.advance(2_000);
        result = await kit.engineFor('node-b').resume('s1');
      }

      expect(result.status).toBe(SagaStatus.Completed);
    });

    it('compensates before the pivot a round that does not finish within the saga deadline', async () => {
      const { kit, participant } = setup({}, [new ProgressSaga()]);
      participant.script(
        'b.create.v1',
        ...Array.from({ length: 5 }, () =>
          CallOutcome.transientFailure(ProgressSaga.ROUND_PENDING),
        ),
      );
      await kit.sagas.start(
        ProgressSaga,
        {},
        { sagaId: 's1', deadlineMs: 3_000 },
      );

      kit.clock.advance(2_000);
      await kit.engineFor('node-b').resume('s1');
      kit.clock.advance(2_000);
      const result = await kit.engineFor('node-b').resume('s1');

      expect(result.status).toBe(SagaStatus.Compensated);
      expect(result.lastErrorCode).toBe(SagaErrorCode.DeadlineExceeded);
      expect(participant.removes()).toEqual(['b.remove.v1', 'a.remove.v1']);
    });

    it('still counts a transient failure for another reason in that step as a suspension', async () => {
      const { kit, participant } = setup({}, [new ProgressSaga()]);
      participant.script(
        'b.create.v1',
        CallOutcome.transientFailure('timeout'),
      );

      const result = await kit.sagas.start(ProgressSaga, {}, { sagaId: 's1' });

      expect(result.status).toBe(SagaStatus.Suspended);
      expect(result.attempts).toBe(1);
    });
  });

  describe('pivot and protocol violations', () => {
    it('never compensates a transient failure after the pivot, even if the deadline has passed', async () => {
      const { kit, participant } = setup();
      participant.script(
        'post.send.v1',
        CallOutcome.transientFailure('timeout'),
        CallOutcome.transientFailure('timeout'),
      );
      await kit.sagas.start(PivotSaga, {}, { sagaId: 's1', deadlineMs: 100 });

      kit.clock.advance(1_000);
      const result = await kit.engineFor('node-b').resume('s1');

      expect(result.status).toBe(SagaStatus.Suspended);
      expect(result.direction).toBe(StepDirection.Forward);
      expect(participant.removes()).toEqual([]);
    });

    it('requires intervention on a business error after the pivot and does not compensate', async () => {
      const { kit, participant } = setup();
      participant.script('post.send.v1', CallOutcome.businessError('NOPE'));

      const result = await kit.sagas.start(PivotSaga, {}, { sagaId: 's1' });

      expect(result.status).toBe(SagaStatus.RequiresIntervention);
      expect(result.lastErrorCode).toBe('NOPE');
      expect(participant.removes()).toEqual([]);
    });

    it('compensates a protocol violation before the pivot, including the step, and emits the alert', async () => {
      const { kit, participant, events } = setup();
      participant.script(
        'b.create.v1',
        CallOutcome.protocolViolation('bad shape'),
      );

      const result = await kit.sagas.start(ThreeStepSaga, {}, { sagaId: 's1' });

      expect(result.status).toBe(SagaStatus.Compensated);
      expect(result.lastErrorCode).toBe(SagaErrorCode.ProtocolViolation);
      expect(result.lastErrorDetail).toBe('bad shape');
      expect(participant.removes()).toEqual(['b.remove.v1', 'a.remove.v1']);
      expect(events).toContain(SagaEventKind.ProtocolViolation);
    });

    it('requires intervention on a protocol violation after the pivot', async () => {
      const { kit, participant, events } = setup();
      participant.script('post.send.v1', CallOutcome.protocolViolation('bad'));

      const result = await kit.sagas.start(PivotSaga, {}, { sagaId: 's1' });

      expect(result.status).toBe(SagaStatus.RequiresIntervention);
      expect(result.lastErrorCode).toBe(SagaErrorCode.ProtocolViolation);
      expect(events).toContain(SagaEventKind.ProtocolViolation);
    });

    it('treats an output that is not JSON as a protocol violation', async () => {
      const { kit, participant } = setup();
      participant.script(
        'a.create.v1',
        CallOutcome.success({ id: 'x', at: 'now', big: BigInt(1) }),
      );

      const result = await kit.sagas.start(ThreeStepSaga, {}, { sagaId: 's1' });

      expect(result.status).toBe(SagaStatus.Compensated);
      expect(result.lastErrorCode).toBe(SagaErrorCode.ProtocolViolation);
      expect(typeof result.lastErrorDetail).toBe('string');
      expect(participant.removes()).toEqual(['a.remove.v1']);
    });
  });

  describe('state, events and inputs', () => {
    it('requires intervention if onSuccess throws, and leaves the step as succeeded', async () => {
      const { kit, store } = setup({}, [new ThrowingSaga()]);

      const result = await kit.sagas.start(ThrowingSaga, {}, { sagaId: 's1' });

      expect(result.status).toBe(SagaStatus.RequiresIntervention);
      expect(result.lastErrorCode).toBe(SagaErrorCode.StateUpdateFailed);
      expect(result.lastErrorDetail).toBe('Error: state rule failed');
      expect(
        (await store.steps('s1')).find((e) => e.stepIndex === 0)?.status,
      ).toBe(StepStatus.Succeeded);
    });

    it('stops showing the error from previous attempts when the step succeeds', async () => {
      const { kit, participant } = setup();
      participant.script(
        'b.create.v1',
        CallOutcome.transientFailure('timeout'),
      );
      await kit.sagas.start(ThreeStepSaga, {}, { sagaId: 's1' });

      kit.clock.advance(1_000);
      const result = await kit.engineFor('node-b').resume('s1');

      expect(result.lastErrorCode).toBeNull();
      expect(result.lastErrorDetail).toBeNull();
    });

    it('requires intervention if onSuccess leaves a value that is not JSON', async () => {
      const { kit, events } = setup({}, [new DateStateSaga()]);

      const result = await kit.sagas.start(DateStateSaga, {}, { sagaId: 's1' });

      expect(result.status).toBe(SagaStatus.RequiresIntervention);
      expect(result.lastErrorCode).toBe(SagaErrorCode.StateUpdateFailed);
      expect(events).toEqual([SagaEventKind.RequiresIntervention]);
    });

    it('requires intervention if a step input is not JSON, without calling the participant', async () => {
      const { kit, participant } = setup({}, [new BigIntInputSaga()]);

      const result = await kit.sagas.start(
        BigIntInputSaga,
        {},
        { sagaId: 's1' },
      );

      expect(result.status).toBe(SagaStatus.RequiresIntervention);
      expect(result.lastErrorCode).toBe(SagaErrorCode.InputBuildFailed);
      expect(participant.calls).toEqual([]);
    });

    it('requires intervention if building the input throws, with the error name and message', async () => {
      const { kit } = setup({}, [new ThrowingInputSaga()]);

      const result = await kit.sagas.start(
        ThrowingInputSaga,
        {},
        { sagaId: 's1' },
      );

      expect(result.lastErrorCode).toBe(SagaErrorCode.InputBuildFailed);
      expect(result.lastErrorDetail).toBe('Error: cannot build');
    });

    it('requires intervention if the input has a cycle', async () => {
      const { kit } = setup({}, [new CyclicInputSaga()]);

      const result = await kit.sagas.start(
        CyclicInputSaga,
        {},
        { sagaId: 's1' },
      );

      expect(result.lastErrorCode).toBe(SagaErrorCode.InputBuildFailed);
    });

    it('retries with the stored input and does not rebuild the input', async () => {
      const saga = new VolatileSaga();
      const { kit, participant } = setup({}, [saga]);
      participant.script(
        'b.create.v1',
        CallOutcome.transientFailure('timeout'),
      );
      await kit.sagas.start(VolatileSaga, {}, { sagaId: 's1' });

      kit.clock.advance(1_000);
      await kit.engineFor('node-b').resume('s1');

      const bCalls = participant.calls.filter(
        (c) => c.operationId === 'b.create.v1',
      );
      expect(bCalls).toHaveLength(2);
      expect(bCalls[1]?.input).toEqual(bCalls[0]?.input);
      expect(saga.counts.inputs).toBe(1);
    });
  });

  describe('configuration building', () => {
    it('takes the backoff wait from the injected random generator', () => {
      const settings = new SagaSettings(
        { owner: 'node-a' },
        new FixedRandomSource([0.5]),
      );

      expect(settings.suspendPolicy().backoff(2)).toBe(1500);
    });
  });
});
