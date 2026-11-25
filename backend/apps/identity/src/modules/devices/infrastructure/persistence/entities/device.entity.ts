import { TimestampTransformer, VersionedEntity } from '@platform/persistence';
import { Column, Entity, Index } from 'typeorm';

const timestamp = new TimestampTransformer();

/** `devices`, in the user's shard. */
@Entity({ name: 'devices' })
@Index('devices_user_idx', ['userId', 'lastSeenAt'])
export class DeviceEntity extends VersionedEntity {
  @Column({ type: 'uuid', name: 'user_id', nullable: false })
  userId!: string;

  @Column({ type: 'varchar', length: 120, name: 'name', nullable: false })
  name!: string;

  @Column({ type: 'varchar', length: 16, name: 'platform', nullable: false })
  platform!: string;

  @Column({ type: 'text', name: 'public_key', nullable: false })
  publicKey!: string;

  @Column({
    type: 'timestamptz',
    name: 'first_seen_at',
    nullable: false,
    transformer: timestamp,
  })
  firstSeenAt!: Date;

  @Column({
    type: 'timestamptz',
    name: 'last_seen_at',
    nullable: false,
    transformer: timestamp,
  })
  lastSeenAt!: Date;

  @Column({ type: 'varchar', length: 64, name: 'last_ip', nullable: false })
  lastIp!: string;

  @Column({
    type: 'timestamptz',
    name: 'trusted_until',
    nullable: true,
    transformer: timestamp,
  })
  trustedUntil!: Date | null;

  @Column({ type: 'boolean', name: 'verifier', nullable: false })
  verifier!: boolean;

  @Column({ type: 'varchar', length: 512, name: 'push_token', nullable: true })
  pushToken!: string | null;

  @Column({
    type: 'timestamptz',
    name: 'removed_at',
    nullable: true,
    transformer: timestamp,
  })
  removedAt!: Date | null;
}
