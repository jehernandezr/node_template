import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

/** `tenant_lookup`, in the catalog: one slug per platform. */
@Entity({ name: 'tenant_lookup' })
export class TenantLookupEntity {
  @PrimaryColumn({ type: 'text', name: 'slug' })
  slug!: string;

  @Index('tenant_lookup_tenant_id_key', { unique: true })
  @Column({ type: 'uuid', name: 'tenant_id', nullable: false })
  tenantId!: string;

  @Column({ type: 'text', name: 'region', nullable: false })
  region!: string;
}
