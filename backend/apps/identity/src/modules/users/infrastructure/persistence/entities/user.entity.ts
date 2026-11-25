import { TimestampTransformer, VersionedEntity } from '@platform/persistence';
import { Column, Entity, Index } from 'typeorm';

const timestamp = new TimestampTransformer();

/** `users`, in the user's shard. */
@Entity({ name: 'users' })
export class UserEntity extends VersionedEntity {
  @Column({ type: 'uuid', name: 'home_tenant_id', nullable: false })
  homeTenantId!: string;

  @Column({ type: 'varchar', length: 254, name: 'email', nullable: false })
  email!: string;

  @Index('users_email_fingerprint_key', { unique: true })
  @Column({ type: 'bytea', name: 'email_fingerprint', nullable: false })
  emailFingerprint!: Buffer;

  @Column({
    type: 'timestamptz',
    name: 'email_verified_at',
    nullable: true,
    transformer: timestamp,
  })
  emailVerifiedAt!: Date | null;

  @Column({ type: 'varchar', length: 32, name: 'status', nullable: false })
  status!: string;

  @Column({
    type: 'varchar',
    length: 120,
    name: 'display_name',
    nullable: false,
  })
  displayName!: string;

  @Column({ type: 'varchar', length: 35, name: 'locale', nullable: false })
  locale!: string;

  @Column({ type: 'uuid', name: 'last_tenant_id', nullable: true })
  lastTenantId!: string | null;
}
