import {
  SagaInstance,
  type SagaStatus,
  type StepDirection,
} from '@platform/saga';
import { SagaInstanceEntity } from './saga-instance.entity.js';

/** Converts between the saga instance and its row, with `tenantId` as the tenant that owns the shard. */
export class SagaInstanceMapper {
  /**
   * Returns a new row with all the instance fields and `tenantId`. An undefined
   * `state` is stored as `null`, because the column is nullable `jsonb`.
   */
  toPersistence(instance: SagaInstance, tenantId: string): SagaInstanceEntity {
    const props = instance.toProps();
    const entity = new SagaInstanceEntity();
    entity.id = props.id;
    entity.tenantId = tenantId;
    entity.type = props.type;
    entity.idempotencyKey = props.idempotencyKey;
    entity.status = props.status;
    entity.state = props.state === undefined ? null : props.state;
    entity.currentStep = props.currentStep;
    entity.direction = props.direction;
    entity.version = props.version;
    entity.leaseToken = props.leaseToken;
    entity.leaseUntil = props.leaseUntil;
    entity.nextAttemptAt = props.nextAttemptAt;
    entity.attempts = props.attempts;
    entity.suspendedSince = props.suspendedSince;
    entity.deadlineAt = props.deadlineAt;
    entity.lastErrorCode = props.lastErrorCode;
    entity.lastErrorDetail = props.lastErrorDetail;
    entity.context = props.context;
    entity.inputDigest = props.inputDigest;
    entity.createdAt = props.createdAt;
    entity.updatedAt = props.updatedAt;
    return entity;
  }

  /** Returns the instance rebuilt with `SagaInstance.rehydrate`. A null `state` comes back as `undefined`. */
  toDomain(entity: SagaInstanceEntity): SagaInstance {
    return SagaInstance.rehydrate({
      id: entity.id,
      type: entity.type,
      idempotencyKey: entity.idempotencyKey,
      status: entity.status as SagaStatus,
      state: entity.state ?? undefined,
      currentStep: entity.currentStep,
      direction: entity.direction as StepDirection,
      version: entity.version,
      leaseToken: entity.leaseToken,
      leaseUntil: entity.leaseUntil,
      nextAttemptAt: entity.nextAttemptAt,
      attempts: entity.attempts,
      suspendedSince: entity.suspendedSince,
      deadlineAt: entity.deadlineAt,
      lastErrorCode: entity.lastErrorCode,
      lastErrorDetail: entity.lastErrorDetail,
      context: entity.context ?? null,
      inputDigest: entity.inputDigest,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }
}
