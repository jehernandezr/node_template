import { Entity, PrimaryColumn } from 'typeorm';

/**
 * Candados por shard lógico. `TypeOrmDirectoryStore.putPlacement` los toma con `SELECT ... FOR UPDATE`, en orden,
 * antes de contar los tenants de un shard: así dos altas concurrentes sobre un shard vacío se serializan. La tabla
 * no guarda datos, solo existe para tener una fila que bloquear por shard.
 */
@Entity({ name: 'shard_locks' })
export class ShardLockEntity {
  @PrimaryColumn({ type: 'text', name: 'logical_shard' })
  logicalShard!: string;
}
