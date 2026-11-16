import { SagaStatus, StepDirection } from '@platform/saga';
import { SagaInstanceBuilder } from '@platform/saga/test-utils';
import { SagaInstanceEntity } from '../saga-instance.entity.js';
import { SagaInstanceMapper } from '../saga-instance.mapper.js';

const TENANT = '0193f1c2-0000-7000-8000-0000000000a1';
const LATER = new Date('2026-01-02T03:04:05.000Z');

describe('SagaInstanceMapper', () => {
  const mapper = new SagaInstanceMapper();

  it('ida y vuelta: toDomain(toPersistence(x)) conserva todos los campos', () => {
    const instance = SagaInstanceBuilder.aSaga()
      .with({
        idempotencyKey: 'key-1',
        status: SagaStatus.Suspended,
        state: { name: 'acme', items: [1, 2] },
        currentStep: 2,
        direction: StepDirection.Compensate,
        version: 7,
        leaseToken: 'node-a:1',
        leaseUntil: LATER,
        nextAttemptAt: LATER,
        attempts: 3,
        suspendedSince: LATER,
        deadlineAt: LATER,
        lastErrorCode: 'PLATFORM.SAGA.UNCERTAIN_OUTCOME',
        lastErrorDetail: 'timeout',
        context: { tenantId: TENANT, actorId: 'user-1', traceparent: 'x' },
        inputDigest: 'digest-1',
      })
      .build();

    const row = mapper.toPersistence(instance, TENANT);
    const back = mapper.toDomain(row);

    expect(back.toProps()).toEqual(instance.toProps());
  });

  it('guarda el tenant recibido y no el del contexto de la instancia', () => {
    const instance = SagaInstanceBuilder.aSaga().build();

    const row = mapper.toPersistence(instance, TENANT);

    expect(row).toBeInstanceOf(SagaInstanceEntity);
    expect(row.tenantId).toBe(TENANT);
    expect(row.id).toBe(instance.id);
  });

  it('un state indefinido se guarda como null y vuelve como undefined', () => {
    const instance = SagaInstanceBuilder.aSaga()
      .with({ state: undefined })
      .build();

    const row = mapper.toPersistence(instance, TENANT);

    expect(row.state).toBeNull();
    expect(mapper.toDomain(row).state).toBeUndefined();
  });

  it('un contexto nulo vuelve como null', () => {
    const instance = SagaInstanceBuilder.aSaga()
      .with({ context: null })
      .build();

    const back = mapper.toDomain(mapper.toPersistence(instance, TENANT));

    expect(back.context).toBeNull();
    expect(back.tenantId).toBeNull();
  });
});
