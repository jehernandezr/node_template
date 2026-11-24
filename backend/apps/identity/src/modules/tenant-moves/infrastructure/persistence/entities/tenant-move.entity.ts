import { TimestampTransformer } from '@platform/persistence';
import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

/** `tenant_moves`, en el catálogo: un traslado de tenant, su saga y en qué etapa está. */
@Entity({ name: 'tenant_moves' })
@Index('tenant_moves_one_running_key', ['tenantId'], {
  unique: true,
  where: `"status" = 'running'`,
})
@Index('tenant_moves_switched_idx', ['status', 'switchedAt'])
export class TenantMoveEntity {
  @PrimaryColumn({ type: 'uuid', name: 'move_id' })
  moveId!: string;

  @Column({ type: 'uuid', name: 'tenant_id', nullable: false })
  tenantId!: string;

  @Column({
    type: 'varchar',
    length: 64,
    name: 'target_group',
    nullable: false,
  })
  targetGroup!: string;

  @Column({
    type: 'varchar',
    length: 64,
    name: 'target_region',
    nullable: false,
  })
  targetRegion!: string;

  @Column({ type: 'uuid', name: 'saga_id', nullable: false })
  sagaId!: string;

  @Column({ type: 'varchar', length: 16, name: 'status', nullable: false })
  status!: string;

  @Column({
    type: 'timestamptz',
    name: 'started_at',
    nullable: false,
    transformer: new TimestampTransformer(),
  })
  startedAt!: Date;

  @Column({
    type: 'timestamptz',
    name: 'switched_at',
    nullable: true,
    transformer: new TimestampTransformer(),
  })
  switchedAt!: Date | null;

  @Column({
    type: 'timestamptz',
    name: 'cleanup_attempted_at',
    nullable: true,
    transformer: new TimestampTransformer(),
  })
  cleanupAttemptedAt!: Date | null;
}
