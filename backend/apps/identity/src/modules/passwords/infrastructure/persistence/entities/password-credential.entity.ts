import { TimestampTransformer, VersionedEntity } from '@platform/persistence';
import { Column, Entity } from 'typeorm';

/** `password_credentials`, in the user's shard. The id is the user's: they have only one. */
@Entity({ name: 'password_credentials' })
export class PasswordCredentialEntity extends VersionedEntity {
  @Column({ type: 'text', name: 'hash', nullable: false })
  hash!: string;

  @Column({
    type: 'timestamptz',
    name: 'changed_at',
    nullable: false,
    transformer: new TimestampTransformer(),
  })
  changedAt!: Date;
}
