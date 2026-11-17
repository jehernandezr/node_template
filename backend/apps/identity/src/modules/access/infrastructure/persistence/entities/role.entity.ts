import { AuditedEntity } from '@platform/persistence';
import { Column, Entity, Index } from 'typeorm';

/** `roles`: roles del tenant con sus permisos. */
@Entity({ name: 'roles' })
@Index('roles_name_key', ['tenantId', 'name'], { unique: true })
export class RoleEntity extends AuditedEntity {
  @Column({ type: 'varchar', length: 80, name: 'name', nullable: false })
  name!: string;

  @Column({ type: 'varchar', length: 16, name: 'system_role', nullable: true })
  systemRole!: string | null;

  @Column({ type: 'jsonb', name: 'permissions', nullable: false })
  permissions!: string[];
}
