import { TimestampTransformer } from '@platform/persistence';
import { Column, Entity, PrimaryColumn } from 'typeorm';

/**
 * How far the verification of a table got in the destination shard of a move, so each call continues
 * where the previous one left off. Written and read by the batched copy of `@platform/tenant-move`.
 */
@Entity({ name: 'tenant_move_checkpoints' })
export class TenantMoveCheckpointEntity {
  @PrimaryColumn({ type: 'text', name: 'move_id' })
  moveId!: string;

  @PrimaryColumn({ type: 'text', name: 'table_name' })
  tableName!: string;

  /** Key of the last reconciled row, as text per column. */
  @Column({ type: 'jsonb', name: 'reconciled_key', nullable: true })
  reconciledKey!: string[] | null;

  @Column({ type: 'integer', name: 'verified_rows', nullable: true })
  verifiedRows!: number | null;

  @Column({ type: 'text', name: 'verified_checksum', nullable: true })
  verifiedChecksum!: string | null;

  @Column({
    type: 'timestamptz',
    name: 'updated_at',
    nullable: false,
    transformer: new TimestampTransformer(),
  })
  updatedAt!: Date;
}
