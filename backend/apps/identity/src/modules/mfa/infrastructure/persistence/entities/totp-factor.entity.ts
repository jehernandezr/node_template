import { TimestampTransformer, VersionedEntity } from '@platform/persistence';
import { Column, Entity } from 'typeorm';

/** `totp_factors`, in the user's shard. The id is the user's: they have only one. */
@Entity({ name: 'totp_factors' })
export class TotpFactorEntity extends VersionedEntity {
  @Column({ type: 'text', name: 'encrypted_secret', nullable: false })
  encryptedSecret!: string;

  @Column({
    type: 'timestamptz',
    name: 'confirmed_at',
    nullable: true,
    transformer: new TimestampTransformer(),
  })
  confirmedAt!: Date | null;

  @Column({ type: 'bigint', name: 'last_used_step', nullable: false })
  lastUsedStep!: string;
}
