import {
  Access,
  defineRoute,
  HttpMethod,
  PageQuerySchema,
  PlatformErrorCode,
} from '@contracts/platform';
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

/** `GET /v1/tenant/members`: miembros del tenant. */
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
  description: 'Lista los miembros del tenant con sus grupos.',
});

/** `DELETE /v1/tenant/members/{userId}`: quita a un miembro del tenant. */
export const RemoveMemberRoute = defineRoute({
  id: IdentityRoute.RemoveMember,
  method: HttpMethod.Delete,
  path: '/v1/tenant/members/{userId}',
  request: RemoveMemberRequestSchema,
  errors: [
    ...forbidden,
    IdentityErrorCode.AccessLastOwner,
    PlatformErrorCode.ResourceNotFound,
  ],
  access: Access.authenticated({
    permissions: [Permission.IdentityMembersManage],
  }),
  description: 'Quita a un miembro del tenant y revoca sus sesiones en él.',
});

/** `PUT /v1/tenant/members/{userId}/groups`: reemplaza los grupos de un miembro. */
export const SetMemberGroupsRoute = defineRoute({
  id: IdentityRoute.SetMemberGroups,
  method: HttpMethod.Put,
  path: '/v1/tenant/members/{userId}/groups',
  request: SetMemberGroupsRequestSchema,
  errors: [...forbidden, PlatformErrorCode.ResourceNotFound],
  access: Access.authenticated({
    permissions: [Permission.IdentityMembersManage],
  }),
  description: 'Reemplaza los grupos de un miembro del tenant.',
});

/** `GET /v1/tenant/groups`: grupos del tenant. */
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
  description: 'Lista los grupos del tenant.',
});

/** `POST /v1/tenant/groups`: crea un grupo. */
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
  description: 'Crea un grupo en el tenant.',
});

/** `PATCH /v1/tenant/groups/{groupId}`: cambia el nombre de un grupo. */
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
  description: 'Cambia el nombre de un grupo del tenant.',
});

/** `DELETE /v1/tenant/groups/{groupId}`: borra un grupo. */
export const DeleteGroupRoute = defineRoute({
  id: IdentityRoute.DeleteGroup,
  method: HttpMethod.Delete,
  path: '/v1/tenant/groups/{groupId}',
  request: DeleteGroupRequestSchema,
  errors: [...forbidden, PlatformErrorCode.ResourceNotFound],
  access: Access.authenticated({
    permissions: [Permission.IdentityGroupsManage],
  }),
  description: 'Borra un grupo del tenant y quita sus miembros del grupo.',
});

/** `PUT /v1/tenant/groups/{groupId}/roles`: reemplaza los roles de un grupo. */
export const SetGroupRolesRoute = defineRoute({
  id: IdentityRoute.SetGroupRoles,
  method: HttpMethod.Put,
  path: '/v1/tenant/groups/{groupId}/roles',
  request: SetGroupRolesRequestSchema,
  errors: [...forbidden, PlatformErrorCode.ResourceNotFound],
  access: Access.authenticated({
    permissions: [Permission.IdentityGroupsManage],
  }),
  description: 'Reemplaza los roles de un grupo del tenant.',
});

/** `GET /v1/tenant/roles`: roles del tenant. */
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
  description: 'Lista los roles del tenant con sus permisos.',
});

/** `POST /v1/tenant/roles`: crea un rol personalizado. */
export const CreateRoleRoute = defineRoute({
  id: IdentityRoute.CreateRole,
  method: HttpMethod.Post,
  path: '/v1/tenant/roles',
  request: CreateRoleRequestSchema,
  response: RoleSummarySchema,
  successStatus: 201,
  errors: [...forbidden, IdentityErrorCode.AccessNameTaken],
  access: Access.authenticated({
    permissions: [Permission.IdentityRolesManage],
  }),
  description: 'Crea un rol personalizado con sus permisos.',
});

/** `PATCH /v1/tenant/roles/{roleId}`: cambia el nombre o los permisos de un rol. */
export const UpdateRoleRoute = defineRoute({
  id: IdentityRoute.UpdateRole,
  method: HttpMethod.Patch,
  path: '/v1/tenant/roles/{roleId}',
  request: UpdateRoleRequestSchema,
  response: RoleSummarySchema,
  errors: [
    ...forbidden,
    IdentityErrorCode.AccessNameTaken,
    IdentityErrorCode.AccessSystemRoleImmutable,
    PlatformErrorCode.ResourceNotFound,
  ],
  access: Access.authenticated({
    permissions: [Permission.IdentityRolesManage],
  }),
  description: 'Cambia el nombre o los permisos de un rol del tenant.',
});

/** `DELETE /v1/tenant/roles/{roleId}`: borra un rol personalizado. */
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
    'Borra un rol personalizado del tenant. Los roles de sistema no se borran.',
});
