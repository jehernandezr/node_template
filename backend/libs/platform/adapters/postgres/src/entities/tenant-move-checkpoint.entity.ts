import { TimestampTransformer } from '@platform/persistence';
import { Column, Entity, PrimaryColumn } from 'typeorm';

/**
 * Hasta dónde llegó la verificación de una tabla en el shard de destino de un traslado, para que cada llamada siga
 * donde quedó la anterior. La escribe y la lee la copia por lotes de `@platform/tenant-move`.
 */
@Entity({ name: 'tenant_move_checkpoints' })
export class TenantMoveCheckpointEntity {
  @PrimaryColumn({ type: 'text', name: 'move_id' })
  moveId!: string;

  @PrimaryColumn({ type: 'text', name: 'table_name' })
  tableName!: string;

  /** Llave de la última fila reconciliada, como texto por columna. */
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
