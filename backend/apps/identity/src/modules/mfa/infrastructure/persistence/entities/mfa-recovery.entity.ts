import { TimestampTransformer, VersionedEntity } from '@platform/persistence';
import { Column, Entity, Index } from 'typeorm';

const timestamp = new TimestampTransformer();

/** `mfa_recoveries`: recuperaciones del segundo factor del usuario. */
@Entity({ name: 'mfa_recoveries' })
@Index('mfa_recoveries_user_idx', ['userId', 'requestedAt'])
export class MfaRecoveryEntity extends VersionedEntity {
  @Column({ type: 'uuid', name: 'user_id', nullable: false })
  userId!: string;

  @Column({ type: 'text', name: 'token_hash', nullable: false })
  tokenHash!: string;

  @Column({
    type: 'timestamptz',
    name: 'requested_at',
    nullable: false,
    transformer: timestamp,
  })
  requestedAt!: Date;

  @Column({
    type: 'timestamptz',
    name: 'available_at',
    nullable: false,
    transformer: timestamp,
  })
  availableAt!: Date;

  @Column({ type: 'varchar', length: 16, name: 'status', nullable: false })
  status!: string;
}
