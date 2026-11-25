import { Entity, PrimaryColumn } from 'typeorm';

/**
 * Locks per logical shard. `TypeOrmDirectoryStore.putPlacement` takes them with `SELECT ... FOR UPDATE`, in order,
 * before counting the tenants of a shard: so two concurrent creations on an empty shard are serialized. The table
 * stores no data, it only exists to have one row to lock per shard.
 */
@Entity({ name: 'shard_locks' })
export class ShardLockEntity {
  @PrimaryColumn({ type: 'text', name: 'logical_shard' })
  logicalShard!: string;
}
