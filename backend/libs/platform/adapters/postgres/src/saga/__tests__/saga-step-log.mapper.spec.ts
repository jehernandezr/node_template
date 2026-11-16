import { StepDirection, StepStatus } from '@platform/saga';
import { SagaInstanceBuilder } from '@platform/saga/test-utils';
import { SagaStepLogMapper } from '../saga-step-log.mapper.js';

const ID = SagaInstanceBuilder.DEFAULT_ID;
const LATER = new Date('2026-01-02T03:04:05.000Z');

describe('SagaStepLogMapper', () => {
  const mapper = new SagaStepLogMapper();

  it('ida y vuelta de una entrada completada', () => {
    const entry = SagaInstanceBuilder.aStep(ID, 1, {
      status: StepStatus.Succeeded,
      output: { id: 'a-1' },
      errorCode: null,
      traceparent: '00-abc-def-01',
      finishedAt: LATER,
    });

    const back = mapper.toDomain(mapper.toPersistence(entry));

    expect(back).toEqual(entry);
  });

  it('entrada y salida indefinidas se guardan como null y vuelven como undefined', () => {
    const entry = SagaInstanceBuilder.aStep(ID, 0, { input: undefined });

    const row = mapper.toPersistence(entry);
    const back = mapper.toDomain(row);

    expect(row.input).toBeNull();
    expect(row.output).toBeNull();
    expect(back.input).toBeUndefined();
    expect(back.output).toBeUndefined();
  });

  it('conserva la dirección de compensación y el estado de fallo', () => {
    const entry = SagaInstanceBuilder.aStep(ID, 2, {
      direction: StepDirection.Compensate,
      status: StepStatus.Uncertain,
      errorCode: 'PLATFORM.SAGA.UNCERTAIN_OUTCOME',
    });

    const back = mapper.toDomain(mapper.toPersistence(entry));

    expect(back.direction).toBe(StepDirection.Compensate);
    expect(back.status).toBe(StepStatus.Uncertain);
    expect(back.errorCode).toBe('PLATFORM.SAGA.UNCERTAIN_OUTCOME');
  });
});
