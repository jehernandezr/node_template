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
    it('nace en Running, en el paso 0 hacia delante, con versión 0 y el lease de la corrida', () => {
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

    it('normaliza el contexto y conserva solo los campos presentes', () => {
      const instance = SagaInstance.start(
        startInput({ tenantId: 'tenant-1', actorId: undefined }),
      );

      expect(instance.context).toEqual({ tenantId: 'tenant-1' });
      expect(Object.keys(instance.context ?? {})).toEqual(['tenantId']);
    });

    it('guarda null cuando el contexto queda vacío', () => {
      const instance = SagaInstance.start(
        startInput({ tenantId: undefined, actorId: undefined }),
      );

      expect(instance.context).toBeNull();
      expect(instance.tenantId).toBeNull();
    });

    it('expone el tenant del contexto', () => {
      const instance = SagaInstance.start(
        startInput({ tenantId: 'tenant-7', traceparent: '00-a-b-01' }),
      );

      expect(instance.tenantId).toBe('tenant-7');
      expect(instance.context?.traceparent).toBe('00-a-b-01');
    });
  });

  describe('finish', () => {
    it('detiene la saga en RequiresIntervention con el código y el detalle', () => {
      const instance = SagaInstanceBuilder.aSaga()
        .with({
          status: SagaStatus.Suspended,
          nextAttemptAt: at(1),
          suspendedSince: at(0),
        })
        .build()
        .finish(SagaStatus.RequiresIntervention, 'X.Y', 'detalle', at(50));

      expect(instance.status).toBe(SagaStatus.RequiresIntervention);
      expect(instance.nextAttemptAt).toBeNull();
      expect(instance.suspendedSince).toBeNull();
      expect(instance.lastErrorCode).toBe('X.Y');
      expect(instance.lastErrorDetail).toBe('detalle');
      expect(instance.updatedAt).toEqual(at(50));
      expect(instance.isFinished()).toBe(true);
    });

    it('también puede dejar la compensación en CompensationFailed', () => {
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

  describe('estados y plazo', () => {
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
    ])('%s está abierta', (status) => {
      expect(
        SagaInstanceBuilder.aSaga().with({ status }).build().isFinished(),
      ).toBe(false);
    });

    it('el plazo se cumple en su instante exacto y nunca si no existe', () => {
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
    it('devuelve la misma instancia con el mismo tipo y digest', () => {
      const instance = SagaInstanceBuilder.aSaga()
        .with({ inputDigest: 'd1' })
        .build();

      expect(instance.reusableFor('tenant.onboarding', 'd1')).toBe(instance);
    });

    it('rechaza otro tipo con IdempotencyKeyConflict', () => {
      const instance = SagaInstanceBuilder.aSaga().build();

      expect(
        thrownBy(() => instance.reusableFor('otro', 'digest-1'))?.code,
      ).toBe(SagaErrorCode.IdempotencyKeyConflict);
    });

    it('rechaza otro digest con IdempotencyKeyConflict y el id de la saga en details', () => {
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

  describe('transiciones', () => {
    it('recordDispatch pasa a Running hacia delante y a Compensating al deshacer', () => {
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

    it('completeStep avanza, aplica el estado y limpia el error de intentos previos', () => {
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

    it('completeStep del último paso termina en Completed y deja el índice en ese paso', () => {
      const compiled = new ThreeStepSaga().build(resolver);
      const instance = SagaInstanceBuilder.aSaga()
        .with({ currentStep: 2 })
        .build();

      const done = instance.completeStep(compiled, 2, {}, at(1));

      expect(done.status).toBe(SagaStatus.Completed);
      expect(done.currentStep).toBe(2);
    });

    it('startCompensation apunta al paso compensable más alto y conserva el error', () => {
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
        'detalle',
        at(4),
      );

      expect(compensating.direction).toBe(StepDirection.Compensate);
      expect(compensating.status).toBe(SagaStatus.Compensating);
      expect(compensating.currentStep).toBe(1);
      expect(compensating.lastErrorCode).toBe('SOLD_OUT');
      expect(compensating.lastErrorDetail).toBe('detalle');
    });

    it('startCompensation termina en Compensated cuando nada necesita deshacerse', () => {
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

    it('startCompensation salta los pasos de solo lectura', () => {
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

    it('completeCompensation conserva la dirección y el error que inició la compensación', () => {
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
          lastErrorDetail: 'detalle',
          attempts: 2,
        })
        .build();

      const next = instance.completeCompensation(compiled, steps, 0, at(9));

      expect(next.direction).toBe(StepDirection.Compensate);
      expect(next.status).toBe(SagaStatus.Compensating);
      expect(next.currentStep).toBe(0);
      expect(next.attempts).toBe(0);
      expect(next.lastErrorCode).toBe('SOLD_OUT');
      expect(next.lastErrorDetail).toBe('detalle');
    });

    it('completeCompensation termina en Compensated al no quedar nada por deshacer', () => {
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

    it('suspend pausa con el backoff y conserva el inicio de la suspensión', () => {
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

    it('suspend exige intervención al superar los intentos y conserva el inicio', () => {
      const exhausted = SagaInstanceBuilder.aSaga()
        .with({ attempts: 2, suspendedSince: at(100) })
        .build()
        .suspend('TRANSIENT', null, at(200), POLICY);

      expect(exhausted.status).toBe(SagaStatus.RequiresIntervention);
      expect(exhausted.nextAttemptAt).toBeNull();
      expect(exhausted.suspendedSince).toEqual(at(100));
    });

    it('suspend exige intervención al superar la antigüedad máxima', () => {
      const aged = SagaInstanceBuilder.aSaga()
        .with({ suspendedSince: at(0) })
        .build()
        .suspend('TRANSIENT', null, at(10_000), POLICY);

      expect(aged.status).toBe(SagaStatus.RequiresIntervention);
      expect(aged.nextAttemptAt).toBeNull();
    });

    it('withVersion y withLease cambian solo su campo', () => {
      const instance = SagaInstanceBuilder.aSaga().build();

      expect(instance.withVersion(4).version).toBe(4);
      expect(instance.withLease('other', at(9)).leaseToken).toBe('other');
      expect(instance.withLease(null, null).leaseUntil).toBeNull();
    });

    it('rehydrate devuelve los mismos campos', () => {
      const instance = SagaInstanceBuilder.aSaga().build();

      expect(SagaInstance.rehydrate(instance.toProps()).toProps()).toEqual(
        instance.toProps(),
      );
    });
  });
});
