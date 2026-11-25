import type { TenantStatus } from '@platform/sharding';
import { TimestampTransformer } from '@platform/persistence';
import { Check, Column, Entity, PrimaryColumn } from 'typeorm';
import { BigintNumberTransformer } from './bigint-number.transformer.js';

/**
 * Directory of the global catalog: tenant to region and shard group. Routing data only, no personal
 * data. `version` increases on every placement change and the directory only writes a higher version.
 */
@Entity({ name: 'shard_directory' })
@Check('shard_directory_group_check', `"shard_group" <> '{}'`)
@Check('shard_directory_version_check', `"version" >= 0`)
export class ShardDirectoryEntity {
  @PrimaryColumn({ type: 'text', name: 'tenant_id' })
  tenantId!: string;

  @Column({ type: 'text', name: 'region', nullable: false })
  region!: string;

  @Column({ type: 'text', name: 'shard_group', array: true, nullable: false })
  shardGroup!: string[];

  @Column({ type: 'text', name: 'status', nullable: false })
  status!: TenantStatus;

  @Column({
    type: 'bigint',
    name: 'version',
    nullable: false,
    transformer: new BigintNumberTransformer(),
  })
  version!: number;

  @Column({ type: 'boolean', name: 'dedicated', nullable: false })
  dedicated!: boolean;

  @Column({
    type: 'timestamptz',
    name: 'updated_at',
    nullable: false,
    transformer: new TimestampTransformer(),
  })
  updatedAt!: Date;
}
