import { Endpoint, Resource } from '@platform/http/nest';
import {
  GetSessionAccessRoute,
  ListMembersRoute,
  RemoveMemberRoute,
  SetMemberGroupsRoute,
  ListGroupsRoute,
  CreateGroupRoute,
  UpdateGroupRoute,
  DeleteGroupRoute,
  SetGroupRolesRoute,
  ListRolesRoute,
  CreateRoleRoute,
  UpdateRoleRoute,
  DeleteRoleRoute,
} from '@contracts/identity';
import { IdentityResource } from '../../../shared/enums/identity-resource.enum.js';
import { RouteNotImplementedError } from '../../../shared/errors/route-not-implemented.error.js';

@Resource(IdentityResource.Access)
export class AccessController {
  @Endpoint(GetSessionAccessRoute)
  getSessionAccess(): never {
    throw new RouteNotImplementedError(GetSessionAccessRoute.id);
  }

  @Endpoint(ListMembersRoute)
  listMembers(): never {
    throw new RouteNotImplementedError(ListMembersRoute.id);
  }

  @Endpoint(RemoveMemberRoute)
  removeMember(): never {
    throw new RouteNotImplementedError(RemoveMemberRoute.id);
  }

  @Endpoint(SetMemberGroupsRoute)
  setMemberGroups(): never {
    throw new RouteNotImplementedError(SetMemberGroupsRoute.id);
  }

  @Endpoint(ListGroupsRoute)
  listGroups(): never {
    throw new RouteNotImplementedError(ListGroupsRoute.id);
  }

  @Endpoint(CreateGroupRoute)
  createGroup(): never {
    throw new RouteNotImplementedError(CreateGroupRoute.id);
  }

  @Endpoint(UpdateGroupRoute)
  updateGroup(): never {
    throw new RouteNotImplementedError(UpdateGroupRoute.id);
  }

  @Endpoint(DeleteGroupRoute)
  deleteGroup(): never {
    throw new RouteNotImplementedError(DeleteGroupRoute.id);
  }

  @Endpoint(SetGroupRolesRoute)
  setGroupRoles(): never {
    throw new RouteNotImplementedError(SetGroupRolesRoute.id);
  }

  @Endpoint(ListRolesRoute)
  listRoles(): never {
    throw new RouteNotImplementedError(ListRolesRoute.id);
  }

  @Endpoint(CreateRoleRoute)
  createRole(): never {
    throw new RouteNotImplementedError(CreateRoleRoute.id);
  }

  @Endpoint(UpdateRoleRoute)
  updateRole(): never {
    throw new RouteNotImplementedError(UpdateRoleRoute.id);
  }

  @Endpoint(DeleteRoleRoute)
  deleteRole(): never {
    throw new RouteNotImplementedError(DeleteRoleRoute.id);
  }
}
