import { TimestampTransformer } from '@platform/persistence';
import { Column, Entity, PrimaryColumn } from 'typeorm';

/**
 * Barrera de escritura de un tenant que se trasladó o se está trasladando fuera de este shard. La escribe y la
 * lee `TenantWriteFence` de `@platform/persistence`; una fila basta para rechazar toda escritura del tenant aquí.
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

  /** Cuándo pivotó el traslado; mientras es nulo el traslado está a medio camino y frena los mantenimientos. */
  @Column({
    type: 'timestamptz',
    name: 'switched_at',
    nullable: true,
    transformer: new TimestampTransformer(),
  })
  switchedAt!: Date | null;
}
