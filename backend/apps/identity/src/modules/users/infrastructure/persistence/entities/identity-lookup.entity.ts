import { TimestampTransformer } from '@platform/persistence';
import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

/** `identity_lookup`, en el catálogo: un email (por su huella) por plataforma y dónde vive su usuario. */
@Entity({ name: 'identity_lookup' })
export class IdentityLookupEntity {
  @PrimaryColumn({ type: 'bytea', name: 'email_fingerprint' })
  emailFingerprint!: Buffer;

  @Index('identity_lookup_user_id_key', { unique: true })
  @Column({ type: 'uuid', name: 'user_id', nullable: false })
  userId!: string;

  @Column({ type: 'uuid', name: 'home_tenant_id', nullable: false })
  homeTenantId!: string;

  @Column({ type: 'text', name: 'region', nullable: false })
  region!: string;

  @Column({ type: 'text', name: 'status', nullable: false })
  status!: string;

  @Column({
    type: 'timestamptz',
    name: 'created_at',
    nullable: false,
    transformer: new TimestampTransformer(),
  })
  createdAt!: Date;
}
