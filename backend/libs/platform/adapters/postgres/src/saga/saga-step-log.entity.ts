import { TimestampTransformer } from '@platform/persistence';
import { Check, Column, Entity, PrimaryColumn } from 'typeorm';
import { SagaSqlValues } from './saga-sql-values.js';

/**
 * Fila de `saga.step_log`: un intento de un paso en una dirección. La llave es
 * `(saga_id, step_index, direction)`, así reemplazar el intento es un upsert.
 * Sin llave foránea: la purga borra la bitácora junto con la instancia en la
 * misma transacción.
 */
@Entity({ schema: 'saga', name: 'step_log' })
@Check(
  'saga_step_log_direction_check',
  `"direction" IN (${SagaSqlValues.DIRECTIONS})`,
)
@Check(
  'saga_step_log_status_check',
  `"status" IN (${SagaSqlValues.STEP_STATUSES})`,
)
export class SagaStepLogEntity {
  @PrimaryColumn({ type: 'uuid', name: 'saga_id' })
  sagaId!: string;

  @PrimaryColumn({ type: 'integer', name: 'step_index' })
  stepIndex!: number;

  @PrimaryColumn({ type: 'varchar', length: 16, name: 'direction' })
  direction!: string;

  @Column({
    type: 'varchar',
    length: 200,
    name: 'operation_id',
    nullable: false,
  })
  operationId!: string;

  @Column({ type: 'varchar', length: 16, name: 'status', nullable: false })
  status!: string;

  @Column({
    type: 'varchar',
    length: 200,
    name: 'idempotency_key',
    nullable: false,
  })
  idempotencyKey!: string;

  @Column({ type: 'jsonb', name: 'input', nullable: true })
  input!: unknown;

  @Column({ type: 'jsonb', name: 'output', nullable: true })
  output!: unknown;

  @Column({ type: 'varchar', length: 120, name: 'error_code', nullable: true })
  errorCode!: string | null;

  @Column({ type: 'varchar', length: 64, name: 'traceparent', nullable: true })
  traceparent!: string | null;

  @Column({
    type: 'timestamptz',
    name: 'started_at',
    nullable: false,
    transformer: new TimestampTransformer(),
  })
  startedAt!: Date;

  @Column({
    type: 'timestamptz',
    name: 'finished_at',
    nullable: true,
    transformer: new TimestampTransformer(),
  })
  finishedAt!: Date | null;
}
