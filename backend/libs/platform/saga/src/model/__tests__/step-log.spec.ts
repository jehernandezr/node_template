import { SagaInstanceBuilder } from '../../__tests__/utils/saga-instance-builder.js';
import { StepDirection } from '../step-direction.enum.js';
import { StepLog } from '../step-log.js';
import { StepStatus } from '../step-status.enum.js';

const SAGA_ID = SagaInstanceBuilder.DEFAULT_ID;

describe('StepLog', () => {
  const forward0 = SagaInstanceBuilder.aStep(SAGA_ID, 0, {
    status: StepStatus.Succeeded,
  });
  const forward1 = SagaInstanceBuilder.aStep(SAGA_ID, 1, {
    status: StepStatus.Dispatched,
  });

  it('find locates the entry by step and direction', () => {
    const log = StepLog.of([forward0, forward1]);

    expect(log.find(1, StepDirection.Forward)).toEqual(forward1);
    expect(log.find(1, StepDirection.Compensate)).toBeUndefined();
    expect(log.find(5, StepDirection.Forward)).toBeUndefined();
  });

  it('with replaces the existing entry of the same step and direction', () => {
    const log = StepLog.of([forward0, forward1]);
    const done = {
      ...forward1,
      status: StepStatus.Succeeded,
      output: { id: 'x' },
    };

    const updated = log.with(done);

    expect(updated.entries()).toEqual([forward0, done]);
    expect(log.entries()).toEqual([forward0, forward1]);
  });

  it('with appends a new entry at the end', () => {
    const log = StepLog.of([forward0]);
    const compensation = SagaInstanceBuilder.aStep(SAGA_ID, 0, {
      direction: StepDirection.Compensate,
    });

    expect(log.with(compensation).entries()).toEqual([forward0, compensation]);
  });

  it('forwardEntryOf exposes only the view that compensations receive', () => {
    expect(StepLog.forwardEntryOf(forward0)).toEqual({
      input: forward0.input,
      output: forward0.output,
      idempotencyKey: forward0.idempotencyKey,
      status: StepStatus.Succeeded,
    });
  });
});
