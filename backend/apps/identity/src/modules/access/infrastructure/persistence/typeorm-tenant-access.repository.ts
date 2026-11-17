import { Injectable } from '@nestjs/common';
import type { Permission, TenantRole } from '@contracts/identity';
import { RepositoryKit } from '@platform/persistence';
import { TenantShardRepository } from '../../../../database/tenant-shard-repository.js';
import { TenantAccessRepository } from '../../domain/access-store.js';
import type { Group } from '../../domain/group.js';
import type { Membership } from '../../domain/membership.js';
import type { Role } from '../../domain/role.js';
import { GroupEntity } from './entities/group.entity.js';
import { RoleEntity } from './entities/role.entity.js';
import { TenantAccessVersionEntity } from './entities/tenant-access-version.entity.js';
import { TenantMemberEntity } from './entities/tenant-member.entity.js';

/** `TenantAccessRepository` sobre las tablas de acceso del shard del tenant. */
@Injectable()
export class TypeOrmTenantAccessRepository
  extends TenantShardRepository
  implements TenantAccessRepository
{
  constructor(kit: RepositoryKit) {
    super(kit);
  }

  async findMembership(userId: string): Promise<Membership | undefined> {
    const tenantId = this.tenantId();
    const row = await this.read((manager) =>
      manager.findOneBy(TenantMemberEntity, { tenantId, userId }),
    );
    return row === null ? undefined : this.membershipOf(row);
  }

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

  async insertMembership(membership: Membership): Promise<void> {
    await this.insertOwned(TenantMemberEntity, this.memberRow(membership));
  }

  async updateMembership(membership: Membership): Promise<void> {
    await this.updateOwned(TenantMemberEntity, this.memberRow(membership));
  }

  async deleteMembership(userId: string): Promise<void> {
    const tenantId = this.tenantId();
    await this.write((manager) =>
      manager.delete(TenantMemberEntity, { tenantId, userId }),
    );
  }

  async listGroups(): Promise<readonly Group[]> {
    const tenantId = this.tenantId();
    const rows = await this.read((manager) =>
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

  async insertGroup(group: Group): Promise<void> {
    await this.insertOwned(GroupEntity, this.groupRow(group));
  }

  async updateGroup(group: Group): Promise<void> {
    await this.updateOwned(GroupEntity, this.groupRow(group));
  }

  async deleteGroup(groupId: string): Promise<void> {
    const tenantId = this.tenantId();
    await this.write((manager) =>
      manager.delete(GroupEntity, { tenantId, id: groupId }),
    );
  }

  async listRoles(): Promise<readonly Role[]> {
    const tenantId = this.tenantId();
    const rows = await this.read((manager) =>
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

  async insertRole(role: Role): Promise<void> {
    await this.insertOwned(RoleEntity, this.roleRow(role));
  }

  async updateRole(role: Role): Promise<void> {
    await this.updateOwned(RoleEntity, this.roleRow(role));
  }

  async deleteRole(roleId: string): Promise<void> {
    const tenantId = this.tenantId();
    await this.write((manager) =>
      manager.delete(RoleEntity, { tenantId, id: roleId }),
    );
  }

  /**
   * El candado es la fila del tenant en `tenant_access_versions`: se crea en cero si falta (la versión
   * empieza a contar en el primer cambio) y se bloquea hasta el fin de la transacción.
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

  async tenantVersion(): Promise<number> {
    const tenantId = this.tenantId();
    const row = await this.read((manager) =>
      manager.findOneBy(TenantAccessVersionEntity, { id: tenantId, tenantId }),
    );
    return row?.permissionVersion ?? 0;
  }

  async bumpTenantVersion(): Promise<number> {
    const tenantId = this.tenantId();
    // Un solo UPSERT atómico: dos cambios a la vez nunca dejan la misma versión.
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
