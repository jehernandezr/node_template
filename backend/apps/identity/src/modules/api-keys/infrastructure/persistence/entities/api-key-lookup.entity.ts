import { Column, Entity, PrimaryColumn } from 'typeorm';

/** `api_key_lookup`, in the catalog: the tenant of each prefix. */
@Entity({ name: 'api_key_lookup' })
export class ApiKeyLookupEntity {
  @PrimaryColumn({ type: 'text', name: 'prefix' })
  prefix!: string;

  @Column({ type: 'uuid', name: 'tenant_id', nullable: false })
  tenantId!: string;

  @Column({ type: 'text', name: 'region', nullable: false })
  region!: string;
}
