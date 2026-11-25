import type { StepDirection, StepLogEntry, StepStatus } from '@platform/saga';
import { SagaStepLogEntity } from './saga-step-log.entity.js';

/** Converts between the log entry and its row. Undefined `input` and `output` are stored as `null`. */
export class SagaStepLogMapper {
  toPersistence(entry: StepLogEntry): SagaStepLogEntity {
    const row = new SagaStepLogEntity();
    row.sagaId = entry.sagaId;
    row.stepIndex = entry.stepIndex;
    row.direction = entry.direction;
    row.operationId = entry.operationId;
    row.status = entry.status;
    row.idempotencyKey = entry.idempotencyKey;
    row.input = entry.input === undefined ? null : entry.input;
    row.output = entry.output === undefined ? null : entry.output;
    row.errorCode = entry.errorCode;
    row.traceparent = entry.traceparent;
    row.startedAt = entry.startedAt;
    row.finishedAt = entry.finishedAt;
    return row;
  }

  toDomain(entity: SagaStepLogEntity): StepLogEntry {
    return {
      sagaId: entity.sagaId,
      stepIndex: entity.stepIndex,
      operationId: entity.operationId,
      direction: entity.direction as StepDirection,
      status: entity.status as StepStatus,
      idempotencyKey: entity.idempotencyKey,
      input: entity.input ?? undefined,
      output: entity.output ?? undefined,
      errorCode: entity.errorCode,
      traceparent: entity.traceparent,
      startedAt: entity.startedAt,
      finishedAt: entity.finishedAt,
    };
  }
}
