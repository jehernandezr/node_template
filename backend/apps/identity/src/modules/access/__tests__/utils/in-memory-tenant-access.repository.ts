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

  override async findMembership(
    userId: string,
  ): Promise<Membership | undefined> {
    return this.memberships.get(userId);
  }

  override async listMemberships(): Promise<readonly Membership[]> {
    return [...this.memberships.values()];
  }

  override async listMembershipsAfter(
    after: string | undefined,
    limit: number,
  ): Promise<readonly Membership[]> {
    return [...this.memberships.values()]
      .filter(
        (membership) =>
          after === undefined ||
          InMemoryTenantAccessRepository.compareIds(membership.userId, after) >
            0,
      )
      .sort((a, b) =>
        InMemoryTenantAccessRepository.compareIds(a.userId, b.userId),
      )
      .slice(0, limit);
  }

  /** Orders two ids as PostgreSQL orders uuids: by their bytes, so the case of the hex digits does not count. */
  private static compareIds(left: string, right: string): number {
    const a = left.toLowerCase();
    const b = right.toLowerCase();
    return a < b ? -1 : a > b ? 1 : 0;
  }

  override async insertMembership(membership: Membership): Promise<void> {
    this.tombstones.delete(membership.userId);
    this.memberships.set(membership.userId, membership);
  }

  override async updateMembership(membership: Membership): Promise<void> {
    this.memberships.set(membership.userId, membership);
  }

  override async removeMembership(
    userId: string,
    finalVersion: number,
  ): Promise<void> {
    if (this.memberships.delete(userId)) {
      this.tombstones.set(userId, finalVersion);
    }
  }

  override async removedVersion(userId: string): Promise<number | undefined> {
    return this.tombstones.get(userId);
  }

  override async purgeMembership(userId: string): Promise<void> {
    this.memberships.delete(userId);
    this.tombstones.delete(userId);
  }

  override async purgeTenant(): Promise<void> {
    this.memberships.clear();
    this.tombstones.clear();
    this.groups.clear();
    this.roles.clear();
    this.version = 0;
  }

  override async listGroups(): Promise<readonly Group[]> {
    return [...this.groups.values()];
  }

  override async insertGroup(group: Group): Promise<void> {
    this.groups.set(group.id, group);
  }

  override async updateGroup(group: Group): Promise<void> {
    this.groups.set(group.id, group);
  }

  override async deleteGroup(groupId: string): Promise<void> {
    this.groups.delete(groupId);
  }

  override async listRoles(): Promise<readonly Role[]> {
    return [...this.roles.values()];
  }

  override async insertRole(role: Role): Promise<void> {
    this.roles.set(role.id, role);
  }

  override async updateRole(role: Role): Promise<void> {
    this.roles.set(role.id, role);
  }

  override async deleteRole(roleId: string): Promise<void> {
    this.roles.delete(roleId);
  }

  override async tenantVersion(): Promise<number> {
    return this.version;
  }

  /** In memory every change runs from start to end without yielding between the reads and writes of a test. */
  override async lockForChanges(): Promise<void> {
    this.locks += 1;
  }

  override async bumpTenantVersion(): Promise<number> {
    this.version += 1;
    return this.version;
  }
}
