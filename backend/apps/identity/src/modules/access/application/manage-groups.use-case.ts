import { ShardScopes } from '@platform/persistence';
import { Injectable } from '@nestjs/common';
import {
  IdentityErrorCode,
  type GroupPage,
  type GroupSummary,
  type Permission,
} from '@contracts/identity';
import { IdGenerator, TransactionManager } from '@platform/kernel';
import { IdentityError } from '../../../shared/errors/identity.error.js';
import { TenantAccessRepository } from '../domain/access-store.js';
import type { Group } from '../domain/group.js';
import { AccessVersionPublisher } from './access-version-publisher.js';
import { GrantCeiling } from './grant-ceiling.js';

/**
 * Tenant groups. System groups are not renamed or deleted, and a group's roles do not grant or
 * remove permissions the editor does not have.
 */
@Injectable()
export class ManageGroups {
  constructor(
    private readonly tenantAccess: TenantAccessRepository,
    private readonly versions: AccessVersionPublisher,
    private readonly ceiling: GrantCeiling,
    private readonly scopes: ShardScopes,
    private readonly transactions: TransactionManager,
    private readonly ids: IdGenerator,
  ) {}

  /**
   * Reads every group with the roles it grants, for the administration screens.
   * @param tenantId Tenant to read.
   * @returns Its groups with their roles.
   */
  async list(tenantId: string): Promise<GroupPage> {
    return this.scopes.inTenantShard(tenantId, async () => {
      const memberships = await this.tenantAccess.listMemberships();
      const groups = await this.tenantAccess.listGroups();
      return {
        items: groups.map((group) =>
          this.summary(
            group,
            memberships.filter((m) => m.groupIds.includes(group.id)).length,
          ),
        ),
        nextCursor: null,
      };
    });
  }

  /**
   * Creates an empty group.
   * @param tenantId Tenant of the group.
   * @param name Name of the group.
   * @returns The new group.
   */
  async create(tenantId: string, name: string): Promise<GroupSummary> {
    return this.inTransaction(tenantId, async (groups) => {
      this.assertNameFree(groups, name);
      const group: Group = {
        id: this.ids.next().toString(),
        tenantId,
        name,
        systemRole: null,
        roleIds: [],
      };
      await this.tenantAccess.insertGroup(group);
      return this.summary(group, 0);
    });
  }

  /**
   * Renames a group.
   * @param tenantId Tenant of the group.
   * @param groupId Group to rename.
   * @param name New name.
   * @returns The renamed group.
   */
  async rename(
    tenantId: string,
    groupId: string,
    name: string,
  ): Promise<GroupSummary> {
    return this.inTransaction(tenantId, async (groups) => {
      const group = this.editable(groups, groupId);
      if (group.name !== name) {
        this.assertNameFree(groups, name);
      }
      const next = { ...group, name };
      await this.tenantAccess.updateGroup(next);
      return this.summary(next, await this.memberCount(groupId));
    });
  }

  /**
   * Deletes a group, checking the actor can grant what its members lose.
   * @param tenantId Tenant of the group.
   * @param groupId Group to delete.
   * @param granted Permissions of the actor.
   */
  async delete(
    tenantId: string,
    groupId: string,
    granted: readonly Permission[],
  ): Promise<void> {
    await this.inTransaction(tenantId, async (groups) => {
      const group = this.editable(groups, groupId);
      this.ceiling.assertRoles(
        group.roleIds,
        await this.tenantAccess.listRoles(),
        granted,
      );
      for (const membership of await this.tenantAccess.listMemberships()) {
        if (membership.groupIds.includes(groupId)) {
          await this.tenantAccess.updateMembership({
            ...membership,
            groupIds: membership.groupIds.filter((id) => id !== groupId),
            permissionVersion: membership.permissionVersion + 1,
          });
        }
      }
      await this.tenantAccess.deleteGroup(groupId);
      await this.versions.tenantChanged(
        tenantId,
        await this.tenantAccess.bumpTenantVersion(),
      );
    });
  }

  /**
   * Replaces the roles of a group within the actor's grant ceiling and bumps the access version of its members.
   * @param tenantId Tenant of the group.
   * @param groupId Group to change.
   * @param roleIds New roles.
   * @param granted Permissions of the actor.
   */
  async setRoles(
    tenantId: string,
    groupId: string,
    roleIds: readonly string[],
    granted: readonly Permission[],
  ): Promise<void> {
    await this.inTransaction(tenantId, async (groups) => {
      const group = this.editable(groups, groupId);
      const roles = await this.tenantAccess.listRoles();
      this.ceiling.assertRoles(group.roleIds, roles, granted);
      this.ceiling.assertRoles(roleIds, roles, granted);
      await this.tenantAccess.updateGroup({
        ...group,
        roleIds: [...new Set(roleIds)],
      });
      await this.versions.tenantChanged(
        tenantId,
        await this.tenantAccess.bumpTenantVersion(),
      );
    });
  }

  private inTransaction<T>(
    tenantId: string,
    fn: (groups: readonly Group[]) => Promise<T>,
  ): Promise<T> {
    return this.scopes.inTenantShard(tenantId, () =>
      this.transactions.runInTransaction(async () => {
        await this.tenantAccess.lockForChanges();
        return fn(await this.tenantAccess.listGroups());
      }),
    );
  }

  private editable(groups: readonly Group[], groupId: string): Group {
    const group = groups.find((candidate) => candidate.id === groupId);
    if (group === undefined) {
      throw IdentityError.notFound();
    }
    if (group.systemRole !== null) {
      throw new IdentityError(IdentityErrorCode.AccessSystemRoleImmutable);
    }
    return group;
  }

  private assertNameFree(groups: readonly Group[], name: string): void {
    if (groups.some((group) => group.name === name)) {
      throw new IdentityError(IdentityErrorCode.AccessNameTaken);
    }
  }

  private async memberCount(groupId: string): Promise<number> {
    const memberships = await this.tenantAccess.listMemberships();
    return memberships.filter((m) => m.groupIds.includes(groupId)).length;
  }

  private summary(group: Group, memberCount: number): GroupSummary {
    return {
      id: group.id,
      name: group.name,
      system: group.systemRole !== null,
      roleIds: [...group.roleIds],
      memberCount,
    };
  }
}
