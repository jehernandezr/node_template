import {
  SagaInstance,
  type SagaStatus,
  type StepDirection,
} from '@platform/saga';
import { SagaInstanceEntity } from './saga-instance.entity.js';

/** Convierte entre la instancia de saga y su fila, con `tenantId` como el tenant dueño del shard. */
export class SagaInstanceMapper {
  /**
   * Fila nueva con todos los campos de la instancia y `tenantId`. Un `state`
   * indefinido se guarda como `null`, porque la columna es `jsonb` anulable.
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

  /** Instancia reconstruida con `SagaInstance.rehydrate`. Un `state` nulo vuelve como `undefined`. */
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
