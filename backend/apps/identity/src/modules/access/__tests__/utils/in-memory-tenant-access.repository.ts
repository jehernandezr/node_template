import { TenantAccessRepository } from '../../domain/access-store.js';
import type { Group } from '../../domain/group.js';
import type { Membership } from '../../domain/membership.js';
import type { Role } from '../../domain/role.js';

/** Access of a single tenant in memory, as if the shard were already chosen. */
export class InMemoryTenantAccessRepository extends TenantAccessRepository {
  readonly memberships = new Map<string, Membership>();
  readonly groups = new Map<string, Group>();
  readonly roles = new Map<string, Role>();
  readonly tombstones = new Map<string, number>();
  private version = 1;
  /** Times a use case asked to serialize its changes. */
  locks = 0;

  async findMembership(userId: string): Promise<Membership | undefined> {
    return this.memberships.get(userId);
  }

  async listMemberships(): Promise<readonly Membership[]> {
    return [...this.memberships.values()];
  }

  async listMembershipsAfter(
    after: string | undefined,
    limit: number,
  ): Promise<readonly Membership[]> {
    return [...this.memberships.values()]
      .filter((membership) => after === undefined || membership.userId > after)
      .sort((a, b) => a.userId.localeCompare(b.userId))
      .slice(0, limit);
  }

  async insertMembership(membership: Membership): Promise<void> {
    this.tombstones.delete(membership.userId);
    this.memberships.set(membership.userId, membership);
  }

  async updateMembership(membership: Membership): Promise<void> {
    this.memberships.set(membership.userId, membership);
  }

  async removeMembership(userId: string, finalVersion: number): Promise<void> {
    if (this.memberships.delete(userId)) {
      this.tombstones.set(userId, finalVersion);
    }
  }

  async removedVersion(userId: string): Promise<number | undefined> {
    return this.tombstones.get(userId);
  }

  async purgeMembership(userId: string): Promise<void> {
    this.memberships.delete(userId);
    this.tombstones.delete(userId);
  }

  async purgeTenant(): Promise<void> {
    this.memberships.clear();
    this.tombstones.clear();
    this.groups.clear();
    this.roles.clear();
    this.version = 0;
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

  /** In memory every change runs from start to end without yielding between the reads and writes of a test. */
  async lockForChanges(): Promise<void> {
    this.locks += 1;
  }

  async bumpTenantVersion(): Promise<number> {
    this.version += 1;
    return this.version;
  }
}
