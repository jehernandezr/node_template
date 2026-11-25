import { AuditedEntity, TimestampTransformer } from '@platform/persistence';
import { Column, Entity, Index } from 'typeorm';

const timestamp = new TimestampTransformer();

/** `api_keys`, in the tenant shard. */
@Entity({ name: 'api_keys' })
@Index('api_keys_service_account_idx', ['tenantId', 'serviceAccountId'])
export class ApiKeyEntity extends AuditedEntity {
  @Column({ type: 'uuid', name: 'service_account_id', nullable: false })
  serviceAccountId!: string;

  @Index('api_keys_prefix_key', { unique: true })
  @Column({ type: 'varchar', length: 16, name: 'prefix', nullable: false })
  prefix!: string;

  @Column({ type: 'text', name: 'secret_hmac', nullable: false })
  secretHmac!: string;

  @Column({ type: 'varchar', length: 8, name: 'environment', nullable: false })
  environment!: string;

  @Column({
    type: 'timestamptz',
    name: 'expires_at',
    nullable: true,
    transformer: timestamp,
  })
  expiresAt!: Date | null;

  @Column({ type: 'jsonb', name: 'allowed_cidrs', nullable: false })
  allowedCidrs!: string[];

  @Column({
    type: 'timestamptz',
    name: 'last_used_at',
    nullable: true,
    transformer: timestamp,
  })
  lastUsedAt!: Date | null;

  @Column({ type: 'varchar', length: 16, name: 'status', nullable: false })
  status!: string;

  @Column({
    type: 'timestamptz',
    name: 'valid_until',
    nullable: true,
    transformer: timestamp,
  })
  validUntil!: Date | null;
}
