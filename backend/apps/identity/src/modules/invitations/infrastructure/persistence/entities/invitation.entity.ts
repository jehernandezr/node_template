import { AuditedEntity, TimestampTransformer } from '@platform/persistence';
import { Column, Entity, Index } from 'typeorm';

/** `invitations`, in the tenant's shard. */
@Entity({ name: 'invitations' })
export class InvitationEntity extends AuditedEntity {
  @Column({ type: 'varchar', length: 254, name: 'email', nullable: false })
  email!: string;

  @Column({ type: 'jsonb', name: 'group_ids', nullable: false })
  groupIds!: string[];

  @Column({ type: 'uuid', name: 'invited_by', nullable: false })
  invitedBy!: string;

  @Index('invitations_token_hash_key', { unique: true })
  @Column({ type: 'text', name: 'token_hash', nullable: false })
  tokenHash!: string;

  @Column({
    type: 'timestamptz',
    name: 'expires_at',
    nullable: false,
    transformer: new TimestampTransformer(),
  })
  expiresAt!: Date;

  @Column({ type: 'varchar', length: 16, name: 'status', nullable: false })
  status!: string;
}
