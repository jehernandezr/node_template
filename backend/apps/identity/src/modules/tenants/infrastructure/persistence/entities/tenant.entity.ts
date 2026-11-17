import { AuditedEntity } from '@platform/persistence';
import { Column, Entity } from 'typeorm';

/** `tenants`, en el shard del tenant. `tenant_id` es el propio id. */
@Entity({ name: 'tenants' })
export class TenantEntity extends AuditedEntity {
  @Column({ type: 'varchar', length: 63, name: 'slug', nullable: false })
  slug!: string;

  @Column({ type: 'varchar', length: 120, name: 'name', nullable: false })
  name!: string;

  @Column({ type: 'varchar', length: 32, name: 'region', nullable: false })
  region!: string;

  @Column({ type: 'varchar', length: 32, name: 'kind', nullable: false })
  kind!: string;

  @Column({ type: 'varchar', length: 32, name: 'status', nullable: false })
  status!: string;

  @Column({
    type: 'varchar',
    length: 16,
    name: 'pinned_api_version',
    nullable: true,
  })
  pinnedApiVersion!: string | null;
}
