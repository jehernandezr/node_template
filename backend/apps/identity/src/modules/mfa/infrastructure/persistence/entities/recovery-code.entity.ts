import { TimestampTransformer, VersionedEntity } from '@platform/persistence';
import { Column, Entity, Index } from 'typeorm';

/** `recovery_codes`: hashes of the user's recovery codes. */
@Entity({ name: 'recovery_codes' })
@Index('recovery_codes_user_idx', ['userId'])
export class RecoveryCodeEntity extends VersionedEntity {
  @Column({ type: 'uuid', name: 'user_id', nullable: false })
  userId!: string;

  @Column({ type: 'text', name: 'code_hash', nullable: false })
  codeHash!: string;

  @Column({
    type: 'timestamptz',
    name: 'used_at',
    nullable: true,
    transformer: new TimestampTransformer(),
  })
  usedAt!: Date | null;
}
