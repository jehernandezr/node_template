import {
  Access,
  defineRoute,
  HttpMethod,
  PageQuerySchema,
  PlatformErrorCode,
} from '@contracts/platform';
import { MfaRules } from '../constants/identity.constants.js';
import { Permission } from '../enums/access.enum.js';
import { IdentityErrorCode, IdentityRoute } from '../enums/identifiers.enum.js';
import {
  CreateGroupRequestSchema,
  CreateRoleRequestSchema,
  DeleteGroupRequestSchema,
  DeleteRoleRequestSchema,
  GroupPageSchema,
  GroupSummarySchema,
  MemberPageSchema,
  RemoveMemberRequestSchema,
  RolePageSchema,
  RoleSummarySchema,
  SetGroupRolesRequestSchema,
  SetMemberGroupsRequestSchema,
  UpdateGroupRequestSchema,
  UpdateRoleRequestSchema,
} from '../schemas/access.schema.js';
import { SessionGuardErrors } from './session-guard.errors.js';

const forbidden = [...SessionGuardErrors, PlatformErrorCode.AuthForbidden];

/** `GET /v1/tenant/members`: members of the tenant, a page at a time. */
export const ListMembersRoute = defineRoute({
  id: IdentityRoute.ListMembers,
  method: HttpMethod.Get,
  path: '/v1/tenant/members',
  request: PageQuerySchema,
  response: MemberPageSchema,
  errors: forbidden,
  access: Access.authenticated({
    permissions: [Permission.IdentityMembersRead],
  }),
  description:
    'Lists the members of the tenant with their groups, a page at a time.',
});

/** `DELETE /v1/tenant/members/{userId}`: removes a member from the tenant. Requires a recent MFA. */
export const RemoveMemberRoute = defineRoute({
  id: IdentityRoute.RemoveMember,
  method: HttpMethod.Delete,
  path: '/v1/tenant/members/{userId}',
  request: RemoveMemberRequestSchema,
  errors: [
    ...forbidden,
    IdentityErrorCode.MfaStepUpRequired,
    IdentityErrorCode.AccessLastOwner,
    PlatformErrorCode.ResourceNotFound,
  ],
  access: Access.authenticated({
    permissions: [Permission.IdentityMembersManage],
    mfaMaxAgeMinutes: MfaRules.stepUpMaxAgeMinutes,
  }),
  description:
    'Removes a member from the tenant and revokes their sessions in it.',
});

/** `PUT /v1/tenant/members/{userId}/groups`: replaces the groups of a member. Requires a recent MFA. */
export const SetMemberGroupsRoute = defineRoute({
  id: IdentityRoute.SetMemberGroups,
  method: HttpMethod.Put,
  path: '/v1/tenant/members/{userId}/groups',
  request: SetMemberGroupsRequestSchema,
  errors: [
    ...forbidden,
    IdentityErrorCode.MfaStepUpRequired,
    PlatformErrorCode.ResourceNotFound,
  ],
  access: Access.authenticated({
    permissions: [Permission.IdentityMembersManage],
    mfaMaxAgeMinutes: MfaRules.stepUpMaxAgeMinutes,
  }),
  description: 'Replaces the groups of a member of the tenant.',
});

/** `GET /v1/tenant/groups`: groups of the tenant. */
export const ListGroupsRoute = defineRoute({
  id: IdentityRoute.ListGroups,
  method: HttpMethod.Get,
  path: '/v1/tenant/groups',
  request: PageQuerySchema,
  response: GroupPageSchema,
  errors: forbidden,
  access: Access.authenticated({
    permissions: [Permission.IdentityMembersRead],
  }),
  description: 'Lists the groups of the tenant.',
});

/** `POST /v1/tenant/groups`: creates a group. */
export const CreateGroupRoute = defineRoute({
  id: IdentityRoute.CreateGroup,
  method: HttpMethod.Post,
  path: '/v1/tenant/groups',
  request: CreateGroupRequestSchema,
  response: GroupSummarySchema,
  successStatus: 201,
  errors: [...forbidden, IdentityErrorCode.AccessNameTaken],
  access: Access.authenticated({
    permissions: [Permission.IdentityGroupsManage],
  }),
  description: 'Creates a group in the tenant.',
});

/** `PATCH /v1/tenant/groups/{groupId}`: renames a group. */
export const UpdateGroupRoute = defineRoute({
  id: IdentityRoute.UpdateGroup,
  method: HttpMethod.Patch,
  path: '/v1/tenant/groups/{groupId}',
  request: UpdateGroupRequestSchema,
  response: GroupSummarySchema,
  errors: [
    ...forbidden,
    IdentityErrorCode.AccessNameTaken,
    PlatformErrorCode.ResourceNotFound,
  ],
  access: Access.authenticated({
    permissions: [Permission.IdentityGroupsManage],
  }),
  description: 'Renames a group of the tenant.',
});

/** `DELETE /v1/tenant/groups/{groupId}`: deletes a group. */
export const DeleteGroupRoute = defineRoute({
  id: IdentityRoute.DeleteGroup,
  method: HttpMethod.Delete,
  path: '/v1/tenant/groups/{groupId}',
  request: DeleteGroupRequestSchema,
  errors: [...forbidden, PlatformErrorCode.ResourceNotFound],
  access: Access.authenticated({
    permissions: [Permission.IdentityGroupsManage],
  }),
  description: 'Deletes a group of the tenant and takes its members out of it.',
});

/** `PUT /v1/tenant/groups/{groupId}/roles`: replaces the roles of a group. Requires a recent MFA. */
export const SetGroupRolesRoute = defineRoute({
  id: IdentityRoute.SetGroupRoles,
  method: HttpMethod.Put,
  path: '/v1/tenant/groups/{groupId}/roles',
  request: SetGroupRolesRequestSchema,
  errors: [
    ...forbidden,
    IdentityErrorCode.MfaStepUpRequired,
    PlatformErrorCode.ResourceNotFound,
  ],
  access: Access.authenticated({
    permissions: [Permission.IdentityGroupsManage],
    mfaMaxAgeMinutes: MfaRules.stepUpMaxAgeMinutes,
  }),
  description: 'Replaces the roles of a group of the tenant.',
});

/** `GET /v1/tenant/roles`: roles of the tenant. */
export const ListRolesRoute = defineRoute({
  id: IdentityRoute.ListRoles,
  method: HttpMethod.Get,
  path: '/v1/tenant/roles',
  request: PageQuerySchema,
  response: RolePageSchema,
  errors: forbidden,
  access: Access.authenticated({
    permissions: [Permission.IdentityMembersRead],
  }),
  description: 'Lists the roles of the tenant with their permissions.',
});

/** `POST /v1/tenant/roles`: creates a custom role. Requires a recent MFA. */
export const CreateRoleRoute = defineRoute({
  id: IdentityRoute.CreateRole,
  method: HttpMethod.Post,
  path: '/v1/tenant/roles',
  request: CreateRoleRequestSchema,
  response: RoleSummarySchema,
  successStatus: 201,
  errors: [
    ...forbidden,
    IdentityErrorCode.MfaStepUpRequired,
    IdentityErrorCode.AccessNameTaken,
  ],
  access: Access.authenticated({
    permissions: [Permission.IdentityRolesManage],
    mfaMaxAgeMinutes: MfaRules.stepUpMaxAgeMinutes,
  }),
  description: 'Creates a custom role with its permissions.',
});

/** `PATCH /v1/tenant/roles/{roleId}`: renames a role or changes its permissions. Requires a recent MFA. */
export const UpdateRoleRoute = defineRoute({
  id: IdentityRoute.UpdateRole,
  method: HttpMethod.Patch,
  path: '/v1/tenant/roles/{roleId}',
  request: UpdateRoleRequestSchema,
  response: RoleSummarySchema,
  errors: [
    ...forbidden,
    IdentityErrorCode.MfaStepUpRequired,
    IdentityErrorCode.AccessNameTaken,
    IdentityErrorCode.AccessSystemRoleImmutable,
    PlatformErrorCode.ResourceNotFound,
  ],
  access: Access.authenticated({
    permissions: [Permission.IdentityRolesManage],
    mfaMaxAgeMinutes: MfaRules.stepUpMaxAgeMinutes,
  }),
  description: 'Renames a role of the tenant or changes its permissions.',
});

/** `DELETE /v1/tenant/roles/{roleId}`: deletes a custom role. */
export const DeleteRoleRoute = defineRoute({
  id: IdentityRoute.DeleteRole,
  method: HttpMethod.Delete,
  path: '/v1/tenant/roles/{roleId}',
  request: DeleteRoleRequestSchema,
  errors: [
    ...forbidden,
    IdentityErrorCode.AccessSystemRoleImmutable,
    PlatformErrorCode.ResourceNotFound,
  ],
  access: Access.authenticated({
    permissions: [Permission.IdentityRolesManage],
  }),
  description:
    'Deletes a custom role of the tenant. System roles are not deleted.',
});
