import { TimestampTransformer, VersionedEntity } from '@platform/persistence';
import { Column, Entity, Index } from 'typeorm';

/** `passkeys`, in the user's shard. */
@Entity({ name: 'passkeys' })
@Index('passkeys_credential_key', ['userId', 'credentialId'], { unique: true })
export class PasskeyEntity extends VersionedEntity {
  @Column({ type: 'uuid', name: 'user_id', nullable: false })
  userId!: string;

  @Column({ type: 'text', name: 'credential_id', nullable: false })
  credentialId!: string;

  @Column({ type: 'text', name: 'public_key', nullable: false })
  publicKey!: string;

  @Column({ type: 'bigint', name: 'sign_count', nullable: false })
  signCount!: string;

  @Column({ type: 'jsonb', name: 'transports', nullable: false })
  transports!: string[];

  @Column({ type: 'varchar', length: 64, name: 'aaguid', nullable: false })
  aaguid!: string;

  @Column({ type: 'boolean', name: 'backed_up', nullable: false })
  backedUp!: boolean;

  @Column({ type: 'varchar', length: 120, name: 'name', nullable: false })
  name!: string;

  @Column({
    type: 'timestamptz',
    name: 'last_used_at',
    nullable: true,
    transformer: new TimestampTransformer(),
  })
  lastUsedAt!: Date | null;
}
