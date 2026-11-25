import { Entity, PrimaryColumn } from 'typeorm';

/** `platform_role_assignments`: the user's platform roles, in their shard. */
@Entity({ name: 'platform_role_assignments' })
export class PlatformRoleAssignmentEntity {
  @PrimaryColumn({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @PrimaryColumn({ type: 'varchar', length: 32, name: 'role' })
  role!: string;
}
