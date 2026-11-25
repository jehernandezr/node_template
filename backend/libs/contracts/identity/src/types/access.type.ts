import type { Page } from '@contracts/platform';
import type { Permission } from '../enums/access.enum.js';
import type { MembershipChangeKind, TenantRole } from '../enums/tenant.enum.js';

/** Tenant member with its groups. */
export interface MemberSummary {
  userId: string;
  email: string;
  displayName: string;
  groupIds: string[];
  joinedAt: string;
}

export type MemberPage = Page<MemberSummary>;

/** Removes a user from the tenant. */
export interface RemoveMemberRequest {
  userId: string;
}

/** Full replacement of a member's groups. */
export interface SetMemberGroupsRequest {
  userId: string;
  groupIds: string[];
}

/** Tenant group. System groups cannot be deleted. */
export interface GroupSummary {
  id: string;
  name: string;
  system: boolean;
  roleIds: string[];
  memberCount: number;
}

export type GroupPage = Page<GroupSummary>;

/** Creation of a group. */
export interface CreateGroupRequest {
  name: string;
}

/** Renaming of a group. */
export interface UpdateGroupRequest {
  groupId: string;
  name: string;
}

/** Deletion of a group. */
export interface DeleteGroupRequest {
  groupId: string;
}

/** Full replacement of a group's roles. */
export interface SetGroupRolesRequest {
  groupId: string;
  roleIds: string[];
}

/** Tenant role with its permissions. A system role carries the fixed role it represents. */
export interface RoleSummary {
  id: string;
  name: string;
  systemRole: TenantRole | null;
  permissions: Permission[];
}

export type RolePage = Page<RoleSummary>;

/** Creation of a custom role. */
export interface CreateRoleRequest {
  name: string;
  permissions: Permission[];
}

/** Partial changes to a role. */
export interface UpdateRoleRequest {
  roleId: string;
  name?: string;
  permissions?: Permission[];
}

/** Deletion of a role. */
export interface DeleteRoleRequest {
  roleId: string;
}

/** Payload of `identity.membership.changed.v1`. */
export interface MembershipChangedPayload {
  tenantId: string;
  userId: string;
  kind: MembershipChangeKind;
  groupIds: string[];
  changedAt: string;
}

/**
 * Payload of `identity.permissions.changed.v1`. Without `userId` the change affects
 * the whole tenant and consumers invalidate their entire cache.
 */
export interface PermissionsChangedPayload {
  tenantId: string;
  userId?: string;
  /** Version `<tenant>.<user>`, same as the `pv` claim. */
  permissionVersion: string;
  changedAt: string;
}
