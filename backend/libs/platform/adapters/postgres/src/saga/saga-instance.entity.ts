import { TimestampTransformer } from '@platform/persistence';
import type { SagaCallContext } from '@platform/saga';
import { Check, Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { SagaSqlValues } from './saga-sql-values.js';

/**
 * Fila de `saga.instances`: la instancia de una saga en el shard de su tenant.
 * La versión y el lease los maneja `TypeOrmSagaStore` con `UPDATE` protegidos,
 * no el `@VersionColumn` de TypeORM, y las fechas las pone el motor con su reloj.
 */
@Entity({ schema: 'saga', name: 'instances' })
@Check('saga_instances_status_check', `"status" IN (${SagaSqlValues.STATUSES})`)
@Check(
  'saga_instances_direction_check',
  `"direction" IN (${SagaSqlValues.DIRECTIONS})`,
)
@Index('saga_instances_tenant_key_uq', ['tenantId', 'idempotencyKey'], {
  unique: true,
  where: '"idempotency_key" IS NOT NULL',
})
@Index('saga_instances_open_idx', ['updatedAt'], {
  where: `"status" IN (${SagaSqlValues.OPEN_STATUSES})`,
})
@Index('saga_instances_purge_idx', ['status', 'updatedAt'], {
  where: `"status" IN (${SagaSqlValues.PURGEABLE_STATUSES})`,
})
export class SagaInstanceEntity {
  @PrimaryColumn({ type: 'uuid', name: 'id' })
  id!: string;

  @Column({ type: 'uuid', name: 'tenant_id', nullable: false })
  tenantId!: string;

  @Column({ type: 'varchar', length: 120, name: 'type', nullable: false })
  type!: string;

  @Column({
    type: 'varchar',
    length: 200,
    name: 'idempotency_key',
    nullable: true,
  })
  idempotencyKey!: string | null;

  @Column({ type: 'varchar', length: 32, name: 'status', nullable: false })
  status!: string;

  @Column({ type: 'jsonb', name: 'state', nullable: true })
  state!: unknown;

  @Column({ type: 'integer', name: 'current_step', nullable: false })
  currentStep!: number;

  @Column({ type: 'varchar', length: 16, name: 'direction', nullable: false })
  direction!: string;

  @Column({ type: 'integer', name: 'version', nullable: false })
  version!: number;

  @Column({ type: 'varchar', length: 120, name: 'lease_token', nullable: true })
  leaseToken!: string | null;

  @Column({
    type: 'timestamptz',
    name: 'lease_until',
    nullable: true,
    transformer: new TimestampTransformer(),
  })
  leaseUntil!: Date | null;

  @Column({
    type: 'timestamptz',
    name: 'next_attempt_at',
    nullable: true,
    transformer: new TimestampTransformer(),
  })
  nextAttemptAt!: Date | null;

  @Column({ type: 'integer', name: 'attempts', nullable: false })
  attempts!: number;

  @Column({
    type: 'timestamptz',
    name: 'suspended_since',
    nullable: true,
    transformer: new TimestampTransformer(),
  })
  suspendedSince!: Date | null;

  @Column({
    type: 'timestamptz',
    name: 'deadline_at',
    nullable: true,
    transformer: new TimestampTransformer(),
  })
  deadlineAt!: Date | null;

  @Column({
    type: 'varchar',
    length: 120,
    name: 'last_error_code',
    nullable: true,
  })
  lastErrorCode!: string | null;

  @Column({
    type: 'varchar',
    length: 300,
    name: 'last_error_detail',
    nullable: true,
  })
  lastErrorDetail!: string | null;

  @Column({ type: 'jsonb', name: 'context', nullable: true })
  context!: SagaCallContext | null;

  @Column({
    type: 'varchar',
    length: 128,
    name: 'input_digest',
    nullable: false,
  })
  inputDigest!: string;

  @Column({
    type: 'timestamptz',
    name: 'created_at',
    nullable: false,
    transformer: new TimestampTransformer(),
  })
  createdAt!: Date;

  @Column({
    type: 'timestamptz',
    name: 'updated_at',
    nullable: false,
    transformer: new TimestampTransformer(),
  })
  updatedAt!: Date;
}
