import { TimestampTransformer, VersionedEntity } from '@platform/persistence';
import { Column, Entity, Index } from 'typeorm';

const timestamp = new TimestampTransformer();

/** `sessions`, in the user's shard. */
@Entity({ name: 'sessions' })
@Index('sessions_user_active_idx', ['userId', 'lastRefreshAt'], {
  where: '"revoked_at" IS NULL',
})
export class SessionEntity extends VersionedEntity {
  @Column({ type: 'uuid', name: 'user_id', nullable: false })
  userId!: string;

  @Column({ type: 'uuid', name: 'home_tenant_id', nullable: false })
  homeTenantId!: string;

  @Column({ type: 'uuid', name: 'active_tenant_id', nullable: false })
  activeTenantId!: string;

  @Column({ type: 'uuid', name: 'device_id', nullable: true })
  deviceId!: string | null;

  @Column({
    type: 'varchar',
    length: 120,
    name: 'device_name',
    nullable: false,
  })
  deviceName!: string;

  @Column({ type: 'varchar', length: 16, name: 'platform', nullable: false })
  platform!: string;

  @Column({ type: 'text', name: 'token_salt', nullable: false })
  tokenSalt!: string;

  @Column({ type: 'integer', name: 'generation', nullable: false })
  generation!: number;

  @Column({
    type: 'timestamptz',
    name: 'previous_generation_until',
    nullable: true,
    transformer: timestamp,
  })
  previousGenerationUntil!: Date | null;

  @Column({ type: 'jsonb', name: 'amr', nullable: false })
  amr!: string[];

  @Column({
    type: 'timestamptz',
    name: 'auth_time',
    nullable: false,
    transformer: timestamp,
  })
  authTime!: Date;

  @Column({
    type: 'timestamptz',
    name: 'mfa_verified_at',
    nullable: true,
    transformer: timestamp,
  })
  mfaVerifiedAt!: Date | null;

  @Column({
    type: 'timestamptz',
    name: 'idle_expires_at',
    nullable: false,
    transformer: timestamp,
  })
  idleExpiresAt!: Date;

  @Column({
    type: 'timestamptz',
    name: 'absolute_expires_at',
    nullable: false,
    transformer: timestamp,
  })
  absoluteExpiresAt!: Date;

  @Column({
    type: 'timestamptz',
    name: 'last_refresh_at',
    nullable: false,
    transformer: timestamp,
  })
  lastRefreshAt!: Date;

  @Column({ type: 'varchar', length: 64, name: 'ip', nullable: false })
  ip!: string;

  @Column({ type: 'varchar', length: 512, name: 'user_agent', nullable: true })
  userAgent!: string | null;

  @Column({
    type: 'timestamptz',
    name: 'revoked_at',
    nullable: true,
    transformer: timestamp,
  })
  revokedAt!: Date | null;

  @Column({
    type: 'varchar',
    length: 32,
    name: 'revocation_reason',
    nullable: true,
  })
  revocationReason!: string | null;
}
