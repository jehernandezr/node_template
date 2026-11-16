import type { Page } from '@contracts/platform';
import type { Permission } from '../enums/access.enum.js';
import type { MembershipChangeKind, TenantRole } from '../enums/tenant.enum.js';

/** Miembro del tenant con sus grupos. */
export interface MemberSummary {
  userId: string;
  email: string;
  displayName: string;
  groupIds: string[];
  joinedAt: string;
}

export type MemberPage = Page<MemberSummary>;

/** Quitar a un usuario del tenant. */
export interface RemoveMemberRequest {
  userId: string;
}

/** Reemplazo completo de los grupos de un miembro. */
export interface SetMemberGroupsRequest {
  userId: string;
  groupIds: string[];
}

/** Grupo del tenant. Los grupos de sistema no se pueden borrar. */
export interface GroupSummary {
  id: string;
  name: string;
  system: boolean;
  roleIds: string[];
  memberCount: number;
}

export type GroupPage = Page<GroupSummary>;

/** Alta de un grupo. */
export interface CreateGroupRequest {
  name: string;
}

/** Cambio de nombre de un grupo. */
export interface UpdateGroupRequest {
  groupId: string;
  name: string;
}

/** Borrado de un grupo. */
export interface DeleteGroupRequest {
  groupId: string;
}

/** Reemplazo completo de los roles de un grupo. */
export interface SetGroupRolesRequest {
  groupId: string;
  roleIds: string[];
}

/** Rol del tenant con sus permisos. Un rol de sistema lleva el rol fijo que representa. */
export interface RoleSummary {
  id: string;
  name: string;
  systemRole: TenantRole | null;
  permissions: Permission[];
}

export type RolePage = Page<RoleSummary>;

/** Alta de un rol personalizado. */
export interface CreateRoleRequest {
  name: string;
  permissions: Permission[];
}

/** Cambios parciales de un rol. */
export interface UpdateRoleRequest {
  roleId: string;
  name?: string;
  permissions?: Permission[];
}

/** Borrado de un rol. */
export interface DeleteRoleRequest {
  roleId: string;
}

/** Payload de `identity.membership.changed.v1`. */
export interface MembershipChangedPayload {
  tenantId: string;
  userId: string;
  kind: MembershipChangeKind;
  groupIds: string[];
  changedAt: string;
}

/**
 * Payload de `identity.permissions.changed.v1`. Sin `userId` el cambio afecta
 * a todo el tenant y los consumidores invalidan su caché completa.
 */
export interface PermissionsChangedPayload {
  tenantId: string;
  userId?: string;
  /** Versión `<tenant>.<usuario>`, igual que el claim `pv`. */
  permissionVersion: string;
  changedAt: string;
}
