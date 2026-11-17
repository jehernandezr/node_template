import { TenantAccessRepository } from '../../domain/access-store.js';
import type { Group } from '../../domain/group.js';
import type { Membership } from '../../domain/membership.js';
import type { Role } from '../../domain/role.js';

/** Acceso de un solo tenant en memoria, como si el shard ya estuviera elegido. */
export class InMemoryTenantAccessRepository extends TenantAccessRepository {
  readonly memberships = new Map<string, Membership>();
  readonly groups = new Map<string, Group>();
  readonly roles = new Map<string, Role>();
  private version = 1;
  /** Veces que un caso de uso pidió serializar sus cambios. */
  locks = 0;

  async findMembership(userId: string): Promise<Membership | undefined> {
    return this.memberships.get(userId);
  }

  async listMemberships(): Promise<readonly Membership[]> {
    return [...this.memberships.values()];
  }

  async insertMembership(membership: Membership): Promise<void> {
    this.memberships.set(membership.userId, membership);
  }

  async updateMembership(membership: Membership): Promise<void> {
    this.memberships.set(membership.userId, membership);
  }

  async deleteMembership(userId: string): Promise<void> {
    this.memberships.delete(userId);
  }

  async listGroups(): Promise<readonly Group[]> {
    return [...this.groups.values()];
  }

  async insertGroup(group: Group): Promise<void> {
    this.groups.set(group.id, group);
  }

  async updateGroup(group: Group): Promise<void> {
    this.groups.set(group.id, group);
  }

  async deleteGroup(groupId: string): Promise<void> {
    this.groups.delete(groupId);
  }

  async listRoles(): Promise<readonly Role[]> {
    return [...this.roles.values()];
  }

  async insertRole(role: Role): Promise<void> {
    this.roles.set(role.id, role);
  }

  async updateRole(role: Role): Promise<void> {
    this.roles.set(role.id, role);
  }

  async deleteRole(roleId: string): Promise<void> {
    this.roles.delete(roleId);
  }

  async tenantVersion(): Promise<number> {
    return this.version;
  }

  /** En memoria cada cambio corre de principio a fin sin ceder entre lecturas y escrituras de la prueba. */
  async lockForChanges(): Promise<void> {
    this.locks += 1;
  }

  async bumpTenantVersion(): Promise<number> {
    this.version += 1;
    return this.version;
  }
}
