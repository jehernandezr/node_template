import { Column, Entity, PrimaryColumn } from 'typeorm';

/** `passkey_lookup`, in the catalog: where the owner of each credential lives. */
@Entity({ name: 'passkey_lookup' })
export class PasskeyLookupEntity {
  @PrimaryColumn({ type: 'bytea', name: 'credential_id_hash' })
  credentialIdHash!: Buffer;

  @Column({ type: 'uuid', name: 'user_id', nullable: false })
  userId!: string;

  @Column({ type: 'uuid', name: 'home_tenant_id', nullable: false })
  homeTenantId!: string;

  @Column({ type: 'text', name: 'region', nullable: false })
  region!: string;
}
