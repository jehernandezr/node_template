import { TimestampTransformer } from '@platform/persistence';
import { Column, Entity, PrimaryColumn } from 'typeorm';

/** Shard lógico a instancia física, en el catálogo global. */
@Entity({ name: 'shard_instances' })
export class ShardInstanceEntity {
  @PrimaryColumn({ type: 'text', name: 'logical_shard' })
  logicalShard!: string;

  @Column({ type: 'text', name: 'instance', nullable: false })
  instance!: string;

  @Column({
    type: 'timestamptz',
    name: 'updated_at',
    nullable: false,
    transformer: new TimestampTransformer(),
  })
  updatedAt!: Date;
}
