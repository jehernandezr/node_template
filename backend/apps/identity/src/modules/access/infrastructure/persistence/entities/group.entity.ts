import { AuditedEntity } from '@platform/persistence';
import { Column, Entity, Index } from 'typeorm';

/** `groups`: tenant groups with their roles. */
@Entity({ name: 'groups' })
@Index('groups_name_key', ['tenantId', 'name'], { unique: true })
export class GroupEntity extends AuditedEntity {
  @Column({ type: 'varchar', length: 80, name: 'name', nullable: false })
  name!: string;

  @Column({ type: 'varchar', length: 16, name: 'system_role', nullable: true })
  systemRole!: string | null;

  @Column({ type: 'jsonb', name: 'role_ids', nullable: false })
  roleIds!: string[];
}
