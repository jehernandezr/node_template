import { OperationResolver } from '@platform/internal-api';
import { SagaErrorCode } from '../../errors/saga-error-code.enum.js';
import { SagaError } from '../../errors/saga-error.js';
import {
  LookupSaga,
  ThreeStepSaga,
} from '../../__tests__/utils/sample-sagas.js';
import { SagaInstanceBuilder } from '../../__tests__/utils/saga-instance-builder.js';
import { SagaInstance } from '../saga-instance.js';
import { SagaStatus } from '../saga-status.enum.js';
import { StepDirection } from '../step-direction.enum.js';
import { StepLog } from '../step-log.js';
import { StepStatus } from '../step-status.enum.js';
import type { SuspendPolicy } from '../suspend-policy.js';

const NOW = SagaInstanceBuilder.NOW;
const at = (offsetMs: number): Date => new Date(NOW.getTime() + offsetMs);
const resolver = new OperationResolver();
const SAGA_ID = SagaInstanceBuilder.DEFAULT_ID;

const POLICY: SuspendPolicy = {
  maxSuspendAttempts: 2,
  maxSuspendAgeMs: 10_000,
  backoff: () => 500,
};

function startInput(
  context:
    { tenantId?: string; actorId?: string; traceparent?: string } | undefined,
) {
  return {
    id: SAGA_ID,
    type: 'tenant.onboarding',
    idempotencyKey: 'key-1',
    state: { name: 'acme' },
    inputDigest: 'digest-1',
    context,
    leaseToken: 'worker-a:1',
    leaseUntil: at(30_000),
    deadlineAt: null,
    now: NOW,
  };
}

/** Error thrown by `reusableFor`, or `null` if it does not throw, to inspect its fields. */
function thrownBy(action: () => unknown): SagaError | null {
  try {
    action();
    return null;
  } catch (error) {
    return error instanceof SagaError ? error : null;
  }
}

describe('SagaInstance', () => {
  describe('start', () => {
    it('starts in Running, at step 0 going forward, with version 0 and the run lease', () => {
      const instance = SagaInstance.start(startInput(undefined));

      expect(instance.toProps()).toEqual({
        id: SAGA_ID,
        type: 'tenant.onboarding',
        idempotencyKey: 'key-1',
        status: SagaStatus.Running,
        state: { name: 'acme' },
        currentStep: 0,
        direction: StepDirection.Forward,
        version: 0,
        leaseToken: 'worker-a:1',
        leaseUntil: at(30_000),
        nextAttemptAt: null,
        attempts: 0,
        suspendedSince: null,
        deadlineAt: null,
        lastErrorCode: null,
        lastErrorDetail: null,
        context: null,
        inputDigest: 'digest-1',
        createdAt: NOW,
        updatedAt: NOW,
      });
    });

    it('normalizes the context and keeps only the present fields', () => {
      const instance = SagaInstance.start(
        startInput({ tenantId: 'tenant-1', actorId: undefined }),
      );

      expect(instance.context).toEqual({ tenantId: 'tenant-1' });
      expect(Object.keys(instance.context ?? {})).toEqual(['tenantId']);
    });

    it('stores null when the context ends up empty', () => {
      const instance = SagaInstance.start(
        startInput({ tenantId: undefined, actorId: undefined }),
      );

      expect(instance.context).toBeNull();
      expect(instance.tenantId).toBeNull();
    });

    it('exposes the tenant of the context', () => {
      const instance = SagaInstance.start(
        startInput({ tenantId: 'tenant-7', traceparent: '00-a-b-01' }),
      );

      expect(instance.tenantId).toBe('tenant-7');
      expect(instance.context?.traceparent).toBe('00-a-b-01');
    });
  });

  describe('finish', () => {
    it('stops the saga in RequiresIntervention with the code and the detail', () => {
      const instance = SagaInstanceBuilder.aSaga()
        .with({
          status: SagaStatus.Suspended,
          nextAttemptAt: at(1),
          suspendedSince: at(0),
        })
        .build()
        .finish(SagaStatus.RequiresIntervention, 'X.Y', 'detail', at(50));

      expect(instance.status).toBe(SagaStatus.RequiresIntervention);
      expect(instance.nextAttemptAt).toBeNull();
      expect(instance.suspendedSince).toBeNull();
      expect(instance.lastErrorCode).toBe('X.Y');
      expect(instance.lastErrorDetail).toBe('detail');
      expect(instance.updatedAt).toEqual(at(50));
      expect(instance.isFinished()).toBe(true);
    });

    it('can also leave the compensation in CompensationFailed', () => {
      const instance = SagaInstanceBuilder.aSaga()
        .with({
          direction: StepDirection.Compensate,
          status: SagaStatus.Compensating,
        })
        .build()
        .finish(SagaStatus.CompensationFailed, 'LOCKED', null, at(5));

      expect(instance.status).toBe(SagaStatus.CompensationFailed);
      expect(instance.direction).toBe(StepDirection.Compensate);
      expect(instance.lastErrorDetail).toBeNull();
      expect(instance.isFinished()).toBe(true);
    });
  });

  describe('states and deadline', () => {
    it.each([
      SagaStatus.Completed,
      SagaStatus.Compensated,
      SagaStatus.CompensationFailed,
      SagaStatus.RequiresIntervention,
    ])('%s es terminal', (status) => {
      expect(
        SagaInstanceBuilder.aSaga().with({ status }).build().isFinished(),
      ).toBe(true);
    });

    it.each([
      SagaStatus.Running,
      SagaStatus.Suspended,
      SagaStatus.Compensating,
    ])('%s is open', (status) => {
      expect(
        SagaInstanceBuilder.aSaga().with({ status }).build().isFinished(),
      ).toBe(false);
    });

    it('the deadline is met at its exact instant and never if it does not exist', () => {
      const withDeadline = SagaInstanceBuilder.aSaga()
        .with({ deadlineAt: at(1_000) })
        .build();

      expect(withDeadline.deadlinePassed(at(999))).toBe(false);
      expect(withDeadline.deadlinePassed(at(1_000))).toBe(true);
      expect(SagaInstanceBuilder.aSaga().build().deadlinePassed(at(1e9))).toBe(
        false,
      );
    });
  });

  describe('reusableFor', () => {
    it('returns the same instance with the same type and digest', () => {
      const instance = SagaInstanceBuilder.aSaga()
        .with({ inputDigest: 'd1' })
        .build();

      expect(instance.reusableFor('tenant.onboarding', 'd1')).toBe(instance);
    });

    it('rejects another type with IdempotencyKeyConflict', () => {
      const instance = SagaInstanceBuilder.aSaga().build();

      expect(
        thrownBy(() => instance.reusableFor('other', 'digest-1'))?.code,
      ).toBe(SagaErrorCode.IdempotencyKeyConflict);
    });

    it('rejects another digest with IdempotencyKeyConflict and the saga id in details', () => {
      const instance = SagaInstanceBuilder.aSaga()
        .with({ inputDigest: 'd1' })
        .build();

      const error = thrownBy(() =>
        instance.reusableFor('tenant.onboarding', 'd2'),
      );

      expect(error?.code).toBe(SagaErrorCode.IdempotencyKeyConflict);
      expect(error?.details).toEqual({ sagaId: SAGA_ID });
    });
  });

  describe('transitions', () => {
    it('recordDispatch moves to Running going forward and to Compensating when undoing', () => {
      const instance = SagaInstanceBuilder.aSaga()
        .with({ nextAttemptAt: at(3) })
        .build();

      const forward = instance.recordDispatch(StepDirection.Forward, at(10));
      expect(forward.status).toBe(SagaStatus.Running);
      expect(forward.nextAttemptAt).toBeNull();
      expect(forward.updatedAt).toEqual(at(10));

      const back = instance.recordDispatch(StepDirection.Compensate, at(11));
      expect(back.status).toBe(SagaStatus.Compensating);
    });

    it('completeStep advances, applies the state and clears the error from previous attempts', () => {
      const compiled = new ThreeStepSaga().build(resolver);
      const instance = SagaInstanceBuilder.aSaga()
        .with({
          attempts: 3,
          suspendedSince: at(1),
          nextAttemptAt: at(2),
          lastErrorCode: 'X',
          lastErrorDetail: 'y',
        })
        .build();

      const next = instance.completeStep(compiled, 0, { a: 'a-1' }, at(20));

      expect(next.status).toBe(SagaStatus.Running);
      expect(next.currentStep).toBe(1);
      expect(next.state).toEqual({ a: 'a-1' });
      expect(next.attempts).toBe(0);
      expect(next.suspendedSince).toBeNull();
      expect(next.nextAttemptAt).toBeNull();
      expect(next.lastErrorCode).toBeNull();
      expect(next.lastErrorDetail).toBeNull();
      expect(next.updatedAt).toEqual(at(20));
    });

    it('completeStep of the last step ends in Completed and leaves the index on that step', () => {
      const compiled = new ThreeStepSaga().build(resolver);
      const instance = SagaInstanceBuilder.aSaga()
        .with({ currentStep: 2 })
        .build();

      const done = instance.completeStep(compiled, 2, {}, at(1));

      expect(done.status).toBe(SagaStatus.Completed);
      expect(done.currentStep).toBe(2);
    });

    it('startCompensation points to the highest compensable step and keeps the error', () => {
      const compiled = new ThreeStepSaga().build(resolver);
      const steps = StepLog.of([
        SagaInstanceBuilder.aStep(SAGA_ID, 0, { status: StepStatus.Succeeded }),
        SagaInstanceBuilder.aStep(SAGA_ID, 1, { status: StepStatus.Succeeded }),
      ]);
      const instance = SagaInstanceBuilder.aSaga()
        .with({ currentStep: 2 })
        .build();

      const compensating = instance.startCompensation(
        compiled,
        steps,
        1,
        'SOLD_OUT',
        'detail',
        at(4),
      );

      expect(compensating.direction).toBe(StepDirection.Compensate);
      expect(compensating.status).toBe(SagaStatus.Compensating);
      expect(compensating.currentStep).toBe(1);
      expect(compensating.lastErrorCode).toBe('SOLD_OUT');
      expect(compensating.lastErrorDetail).toBe('detail');
    });

    it('startCompensation ends in Compensated when nothing needs undoing', () => {
      const compiled = new ThreeStepSaga().build(resolver);
      const instance = SagaInstanceBuilder.aSaga()
        .with({ currentStep: 0 })
        .build();

      const done = instance.startCompensation(
        compiled,
        StepLog.of([]),
        0,
        'SOLD_OUT',
        null,
        at(4),
      );

      expect(done.status).toBe(SagaStatus.Compensated);
      expect(done.currentStep).toBe(0);
    });

    it('startCompensation skips read-only steps', () => {
      const compiled = new LookupSaga().build(resolver);
      const steps = StepLog.of([
        SagaInstanceBuilder.aStep(SAGA_ID, 0, { status: StepStatus.Succeeded }),
        SagaInstanceBuilder.aStep(SAGA_ID, 1, { status: StepStatus.Succeeded }),
      ]);
      const instance = SagaInstanceBuilder.aSaga()
        .with({ currentStep: 2 })
        .build();

      const compensating = instance.startCompensation(
        compiled,
        steps,
        1,
        'X',
        null,
        at(1),
      );

      expect(compensating.currentStep).toBe(0);
    });

    it('completeCompensation keeps the direction and the error that started the compensation', () => {
      const compiled = new ThreeStepSaga().build(resolver);
      const steps = StepLog.of([
        SagaInstanceBuilder.aStep(SAGA_ID, 0, { status: StepStatus.Succeeded }),
      ]);
      const instance = SagaInstanceBuilder.aSaga()
        .with({
          direction: StepDirection.Compensate,
          status: SagaStatus.Compensating,
          currentStep: 1,
          lastErrorCode: 'SOLD_OUT',
          lastErrorDetail: 'detail',
          attempts: 2,
        })
        .build();

      const next = instance.completeCompensation(compiled, steps, 0, at(9));

      expect(next.direction).toBe(StepDirection.Compensate);
      expect(next.status).toBe(SagaStatus.Compensating);
      expect(next.currentStep).toBe(0);
      expect(next.attempts).toBe(0);
      expect(next.lastErrorCode).toBe('SOLD_OUT');
      expect(next.lastErrorDetail).toBe('detail');
    });

    it('completeCompensation ends in Compensated when nothing is left to undo', () => {
      const compiled = new ThreeStepSaga().build(resolver);
      const instance = SagaInstanceBuilder.aSaga()
        .with({
          direction: StepDirection.Compensate,
          status: SagaStatus.Compensating,
          currentStep: 0,
        })
        .build();

      const next = instance.completeCompensation(
        compiled,
        StepLog.of([]),
        -1,
        at(9),
      );

      expect(next.status).toBe(SagaStatus.Compensated);
    });

    it('suspend pauses with the backoff and keeps the suspension start', () => {
      const instance = SagaInstanceBuilder.aSaga().build();

      const first = instance.suspend('TRANSIENT', 'timeout', at(100), POLICY);

      expect(first.status).toBe(SagaStatus.Suspended);
      expect(first.attempts).toBe(1);
      expect(first.suspendedSince).toEqual(at(100));
      expect(first.nextAttemptAt).toEqual(at(600));
      expect(first.lastErrorCode).toBe('TRANSIENT');
      expect(first.lastErrorDetail).toBe('timeout');

      const second = first.suspend('TRANSIENT', 'timeout', at(700), POLICY);
      expect(second.attempts).toBe(2);
      expect(second.suspendedSince).toEqual(at(100));
      expect(second.status).toBe(SagaStatus.Suspended);
    });

    it('suspend requires intervention when attempts are exceeded and keeps the start', () => {
      const exhausted = SagaInstanceBuilder.aSaga()
        .with({ attempts: 2, suspendedSince: at(100) })
        .build()
        .suspend('TRANSIENT', null, at(200), POLICY);

      expect(exhausted.status).toBe(SagaStatus.RequiresIntervention);
      expect(exhausted.nextAttemptAt).toBeNull();
      expect(exhausted.suspendedSince).toEqual(at(100));
    });

    it('suspend requires intervention when the maximum age is exceeded', () => {
      const aged = SagaInstanceBuilder.aSaga()
        .with({ suspendedSince: at(0) })
        .build()
        .suspend('TRANSIENT', null, at(10_000), POLICY);

      expect(aged.status).toBe(SagaStatus.RequiresIntervention);
      expect(aged.nextAttemptAt).toBeNull();
    });

    it('withVersion and withLease change only their field', () => {
      const instance = SagaInstanceBuilder.aSaga().build();

      expect(instance.withVersion(4).version).toBe(4);
      expect(instance.withLease('other', at(9)).leaseToken).toBe('other');
      expect(instance.withLease(null, null).leaseUntil).toBeNull();
    });

    it('rehydrate returns the same fields', () => {
      const instance = SagaInstanceBuilder.aSaga().build();

      expect(SagaInstance.rehydrate(instance.toProps()).toProps()).toEqual(
        instance.toProps(),
      );
    });
  });
});
