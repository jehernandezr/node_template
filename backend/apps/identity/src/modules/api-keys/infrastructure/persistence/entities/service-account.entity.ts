import { AuditedEntity } from '@platform/persistence';
import { Column, Entity } from 'typeorm';

/** `service_accounts`, en el shard del tenant. */
@Entity({ name: 'service_accounts' })
export class ServiceAccountEntity extends AuditedEntity {
  @Column({ type: 'varchar', length: 120, name: 'name', nullable: false })
  name!: string;

  @Column({ type: 'jsonb', name: 'permissions', nullable: false })
  permissions!: string[];

  @Column({ type: 'varchar', length: 16, name: 'status', nullable: false })
  status!: string;

  @Column({
    type: 'varchar',
    length: 16,
    name: 'pinned_api_version',
    nullable: true,
  })
  pinnedApiVersion!: string | null;
}
