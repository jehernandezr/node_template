import { TimestampTransformer } from '@platform/persistence';
import { Column, Entity, PrimaryColumn } from 'typeorm';

/**
 * Write fence of a tenant that was moved or is being moved out of this shard. Written and
 * read by `TenantWriteFence` from `@platform/persistence`; one row is enough to reject every write of the tenant here.
 */
@Entity({ name: 'tenant_write_fences' })
export class TenantWriteFenceEntity {
  @PrimaryColumn({ type: 'text', name: 'tenant_id' })
  tenantId!: string;

  @Column({ type: 'text', name: 'move_id', nullable: false })
  moveId!: string;

  @Column({
    type: 'timestamptz',
    name: 'created_at',
    nullable: false,
    transformer: new TimestampTransformer(),
  })
  createdAt!: Date;

  /** When the move pivoted; while it is null the move is halfway and holds back maintenance. */
  @Column({
    type: 'timestamptz',
    name: 'switched_at',
    nullable: true,
    transformer: new TimestampTransformer(),
  })
  switchedAt!: Date | null;
}
