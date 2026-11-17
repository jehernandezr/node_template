import type { PlatformRole } from '@contracts/identity';
import type { Group } from './group.js';
import type { Membership } from './membership.js';
import type { Role } from './role.js';
import type { UserTenant } from './user-tenant.js';

/** Membresías, grupos, roles y versión de permisos de un tenant, en el shard del tenant. */
export abstract class TenantAccessRepository {
  abstract findMembership(userId: string): Promise<Membership | undefined>;
  abstract listMemberships(): Promise<readonly Membership[]>;
  abstract insertMembership(membership: Membership): Promise<void>;
  abstract updateMembership(membership: Membership): Promise<void>;
  abstract deleteMembership(userId: string): Promise<void>;

  abstract listGroups(): Promise<readonly Group[]>;
  abstract insertGroup(group: Group): Promise<void>;
  abstract updateGroup(group: Group): Promise<void>;
  abstract deleteGroup(groupId: string): Promise<void>;

  abstract listRoles(): Promise<readonly Role[]>;
  abstract insertRole(role: Role): Promise<void>;
  abstract updateRole(role: Role): Promise<void>;
  abstract deleteRole(roleId: string): Promise<void>;

  /**
   * Serializa los cambios de acceso del tenant hasta que termine la transacción abierta. Se toma antes de
   * leer las membresías: dos cambios a la vez que validan un invariante sobre todo el tenant (el último
   * dueño) verían cada uno el estado previo al otro y los dos confirmarían.
   */
  abstract lockForChanges(): Promise<void>;

  /** Versión de permisos del tenant: la primera parte del claim `pv`. */
  abstract tenantVersion(): Promise<number>;
  /** Sube la versión del tenant y devuelve la nueva. */
  abstract bumpTenantVersion(): Promise<number>;
}

/** Datos de acceso que viven en el shard del usuario. */
export abstract class UserAccessRepository {
  abstract listTenants(userId: string): Promise<readonly UserTenant[]>;
  abstract projectTenant(tenant: UserTenant): Promise<void>;
  abstract removeTenant(userId: string, tenantId: string): Promise<void>;
  abstract platformRoles(userId: string): Promise<readonly PlatformRole[]>;
  abstract grantPlatformRole(userId: string, role: PlatformRole): Promise<void>;
}
