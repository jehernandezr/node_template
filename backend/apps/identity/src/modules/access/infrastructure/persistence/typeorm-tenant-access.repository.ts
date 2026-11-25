import { Injectable } from '@nestjs/common';
import type { Permission, TenantRole } from '@contracts/identity';
import { RepositoryKit, TenantIsolatedRepository } from '@platform/persistence';
import { IsNull, Not } from 'typeorm';
import { TenantAccessRepository } from '../../domain/access-store.js';
import type { Group } from '../../domain/group.js';
import type { Membership } from '../../domain/membership.js';
import type { Role } from '../../domain/role.js';
import { GroupEntity } from './entities/group.entity.js';
import { RoleEntity } from './entities/role.entity.js';
import { TenantAccessVersionEntity } from './entities/tenant-access-version.entity.js';
import { TenantMemberEntity } from './entities/tenant-member.entity.js';

/**
 * `TenantAccessRepository` over the access tables of the tenant shard. A removed member stays as a
 * soft-deleted row that keeps its last permission version: TypeORM reads hide it.
 */
@Injectable()
export class TypeOrmTenantAccessRepository
  extends TenantIsolatedRepository
  implements TenantAccessRepository
{
  private static readonly TENANT_TABLES = [
    'tenant_members',
    'groups',
    'roles',
    'tenant_access_versions',
  ];

  constructor(kit: RepositoryKit) {
    super(kit);
  }

  /** {@inheritDoc TenantAccessRepository.findMembership} */
  async findMembership(userId: string): Promise<Membership | undefined> {
    const tenantId = this.tenantId();
    const row = await this.readPrimary((manager) =>
      manager.findOneBy(TenantMemberEntity, { tenantId, userId }),
    );
    return row === null ? undefined : this.membershipOf(row);
  }

  /** {@inheritDoc TenantAccessRepository.listMemberships} */
  async listMemberships(): Promise<readonly Membership[]> {
    const tenantId = this.tenantId();
    const rows = await this.read((manager) =>
      manager.find(TenantMemberEntity, {
        where: { tenantId },
        order: { joinedAt: 'ASC' },
      }),
    );
    return rows.map((row) => this.membershipOf(row));
  }

  /** {@inheritDoc TenantAccessRepository.insertMembership} */
  async insertMembership(membership: Membership): Promise<void> {
    const tenantId = this.tenantId();
    await this.write((manager) =>
      manager.query(
        'DELETE FROM "tenant_members" WHERE "tenant_id" = $1 AND "user_id" = $2 AND "deleted_at" IS NOT NULL',
        [tenantId, membership.userId],
      ),
    );
    await this.insertOwned(TenantMemberEntity, this.memberRow(membership));
  }

  /** {@inheritDoc TenantAccessRepository.updateMembership} */
  async updateMembership(membership: Membership): Promise<void> {
    await this.updateOwned(TenantMemberEntity, this.memberRow(membership));
  }

  /** {@inheritDoc TenantAccessRepository.removeMembership} */
  async removeMembership(userId: string, finalVersion: number): Promise<void> {
    const tenantId = this.tenantId();
    await this.write((manager) =>
      manager.query(
        'UPDATE "tenant_members" SET "permission_version" = $3, "deleted_at" = now(), "updated_at" = now(), ' +
          '"version" = "version" + 1 WHERE "tenant_id" = $1 AND "user_id" = $2 AND "deleted_at" IS NULL',
        [tenantId, userId, finalVersion],
      ),
    );
  }

  /** {@inheritDoc TenantAccessRepository.removedVersion} */
  async removedVersion(userId: string): Promise<number | undefined> {
    const tenantId = this.tenantId();
    const row = await this.readPrimary((manager) =>
      manager.findOne(TenantMemberEntity, {
        where: { tenantId, userId, deletedAt: Not(IsNull()) },
        withDeleted: true,
      }),
    );
    return row?.permissionVersion;
  }

  /** {@inheritDoc TenantAccessRepository.purgeMembership} */
  async purgeMembership(userId: string): Promise<void> {
    const tenantId = this.tenantId();
    await this.write((manager) =>
      manager.query(
        'DELETE FROM "tenant_members" WHERE "tenant_id" = $1 AND "user_id" = $2',
        [tenantId, userId],
      ),
    );
  }

  /** {@inheritDoc TenantAccessRepository.purgeTenant} */
  async purgeTenant(): Promise<void> {
    const tenantId = this.tenantId();
    await this.write(async (manager) => {
      for (const table of TypeOrmTenantAccessRepository.TENANT_TABLES) {
        await manager.query(`DELETE FROM "${table}" WHERE "tenant_id" = $1`, [
          tenantId,
        ]);
      }
    });
  }

  /** {@inheritDoc TenantAccessRepository.listGroups} */
  async listGroups(): Promise<readonly Group[]> {
    const tenantId = this.tenantId();
    const rows = await this.readPrimary((manager) =>
      manager.find(GroupEntity, {
        where: { tenantId },
        order: { name: 'ASC' },
      }),
    );
    return rows.map((row) => ({
      id: row.id,
      tenantId: row.tenantId,
      name: row.name,
      systemRole: row.systemRole as TenantRole | null,
      roleIds: row.roleIds,
      ...(row.version === undefined ? {} : { version: row.version }),
    }));
  }

  /** {@inheritDoc TenantAccessRepository.insertGroup} */
  async insertGroup(group: Group): Promise<void> {
    await this.insertOwned(GroupEntity, this.groupRow(group));
  }

  /** {@inheritDoc TenantAccessRepository.updateGroup} */
  async updateGroup(group: Group): Promise<void> {
    await this.updateOwned(GroupEntity, this.groupRow(group));
  }

  /** {@inheritDoc TenantAccessRepository.deleteGroup} */
  async deleteGroup(groupId: string): Promise<void> {
    const tenantId = this.tenantId();
    await this.write((manager) =>
      manager.delete(GroupEntity, { tenantId, id: groupId }),
    );
  }

  /** {@inheritDoc TenantAccessRepository.listRoles} */
  async listRoles(): Promise<readonly Role[]> {
    const tenantId = this.tenantId();
    const rows = await this.readPrimary((manager) =>
      manager.find(RoleEntity, { where: { tenantId }, order: { name: 'ASC' } }),
    );
    return rows.map((row) => ({
      id: row.id,
      tenantId: row.tenantId,
      name: row.name,
      systemRole: row.systemRole as TenantRole | null,
      permissions: row.permissions as Permission[],
      ...(row.version === undefined ? {} : { version: row.version }),
    }));
  }

  /** {@inheritDoc TenantAccessRepository.insertRole} */
  async insertRole(role: Role): Promise<void> {
    await this.insertOwned(RoleEntity, this.roleRow(role));
  }

  /** {@inheritDoc TenantAccessRepository.updateRole} */
  async updateRole(role: Role): Promise<void> {
    await this.updateOwned(RoleEntity, this.roleRow(role));
  }

  /** {@inheritDoc TenantAccessRepository.deleteRole} */
  async deleteRole(roleId: string): Promise<void> {
    const tenantId = this.tenantId();
    await this.write((manager) =>
      manager.delete(RoleEntity, { tenantId, id: roleId }),
    );
  }

  /**
   * The lock is the tenant row in `tenant_access_versions`: it is created at zero if missing (the version
   * starts counting at the first change) and locked until the transaction ends.
   */
  async lockForChanges(): Promise<void> {
    const tenantId = this.tenantId();
    await this.write(async (manager) => {
      await manager.query(
        'INSERT INTO "tenant_access_versions" ("id", "tenant_id", "permission_version", "version") VALUES ($1, $1, 0, 1) ' +
          'ON CONFLICT ("id") DO NOTHING',
        [tenantId],
      );
      await manager.query(
        'SELECT 1 FROM "tenant_access_versions" WHERE "id" = $1 FOR UPDATE',
        [tenantId],
      );
    });
  }

  /** {@inheritDoc TenantAccessRepository.tenantVersion} */
  async tenantVersion(): Promise<number> {
    const tenantId = this.tenantId();
    const row = await this.readPrimary((manager) =>
      manager.findOneBy(TenantAccessVersionEntity, { id: tenantId, tenantId }),
    );
    return row?.permissionVersion ?? 0;
  }

  /** A single atomic upsert: two concurrent changes never end on the same version. */
  async bumpTenantVersion(): Promise<number> {
    const tenantId = this.tenantId();
    const rows: Array<{ permission_version: number }> = await this.write(
      (manager) =>
        manager.query(
          'INSERT INTO "tenant_access_versions" ("id", "tenant_id", "permission_version", "version") VALUES ($1, $1, 1, 1) ' +
            'ON CONFLICT ("id") DO UPDATE SET "permission_version" = "tenant_access_versions"."permission_version" + 1, ' +
            '"version" = "tenant_access_versions"."version" + 1, "updated_at" = now() RETURNING "permission_version"',
          [tenantId],
        ),
    );
    return Number(rows[0]?.permission_version ?? 0);
  }

  private membershipOf(row: TenantMemberEntity): Membership {
    return {
      id: row.id,
      tenantId: row.tenantId,
      userId: row.userId,
      homeTenantId: row.homeTenantId,
      groupIds: row.groupIds,
      permissionVersion: row.permissionVersion,
      joinedAt: row.joinedAt,
      ...(row.version === undefined ? {} : { version: row.version }),
    };
  }

  private memberRow(membership: Membership): TenantMemberEntity {
    const row = new TenantMemberEntity();
    row.id = membership.id;
    row.userId = membership.userId;
    row.homeTenantId = membership.homeTenantId;
    row.groupIds = [...membership.groupIds];
    row.permissionVersion = membership.permissionVersion;
    row.joinedAt = membership.joinedAt;
    if (membership.version !== undefined) {
      row.version = membership.version;
    }
    return row;
  }

  private groupRow(group: Group): GroupEntity {
    const row = new GroupEntity();
    row.id = group.id;
    row.name = group.name;
    row.systemRole = group.systemRole;
    row.roleIds = [...group.roleIds];
    if (group.version !== undefined) {
      row.version = group.version;
    }
    return row;
  }

  private roleRow(role: Role): RoleEntity {
    const row = new RoleEntity();
    row.id = role.id;
    row.name = role.name;
    row.systemRole = role.systemRole;
    row.permissions = [...role.permissions];
    if (role.version !== undefined) {
      row.version = role.version;
    }
    return row;
  }
}
