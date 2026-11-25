import { TimestampTransformer, VersionedEntity } from '@platform/persistence';
import { Column, Entity, Index } from 'typeorm';

const timestamp = new TimestampTransformer();

/** `password_resets`, in the user's shard. */
@Entity({ name: 'password_resets' })
@Index('password_resets_user_idx', ['userId'])
export class PasswordResetEntity extends VersionedEntity {
  @Column({ type: 'uuid', name: 'user_id', nullable: false })
  userId!: string;

  @Column({ type: 'text', name: 'token_hash', nullable: false })
  tokenHash!: string;

  @Column({
    type: 'timestamptz',
    name: 'expires_at',
    nullable: false,
    transformer: timestamp,
  })
  expiresAt!: Date;

  @Column({
    type: 'timestamptz',
    name: 'used_at',
    nullable: true,
    transformer: timestamp,
  })
  usedAt!: Date | null;
}
