import { CurrentActor, Endpoint, Input, Resource } from '@platform/http/nest';
import type { Actor } from '@platform/auth';
import { AuthMethod } from '@platform/http';
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
  type CreateGroupRequest,
  type CreateRoleRequest,
  type DeleteGroupRequest,
  type DeleteRoleRequest,
  type GroupPage,
  type GroupSummary,
  type MemberPage,
  type RemoveMemberRequest,
  type RolePage,
  type RoleSummary,
  type SessionAccess,
  type SetGroupRolesRequest,
  type SetMemberGroupsRequest,
  type UpdateGroupRequest,
  type UpdateRoleRequest,
} from '@contracts/identity';
import { IdentityResource } from '../../../shared/enums/identity-resource.enum.js';
import {
  requireUserActor,
  tenantOfActor,
} from '../../../shared/utils/user-actor.js';
import { ActorPermissions } from '../application/actor-permissions.js';
import { GetSessionAccess } from '../application/get-session-access.use-case.js';
import { ManageGroups } from '../application/manage-groups.use-case.js';
import { ManageMembers } from '../application/manage-members.use-case.js';
import { ManageRoles } from '../application/manage-roles.use-case.js';

@Resource(IdentityResource.Access)
export class AccessController {
  constructor(
    private readonly sessionAccess: GetSessionAccess,
    private readonly members: ManageMembers,
    private readonly groups: ManageGroups,
    private readonly roles: ManageRoles,
    private readonly actorPermissions: ActorPermissions,
  ) {}

  @Endpoint(GetSessionAccessRoute)
  getSessionAccess(
    @CurrentActor() actor: Actor | undefined,
  ): Promise<SessionAccess> {
    return this.sessionAccess.execute(requireUserActor(actor));
  }

  /** Una integración del tenant lee sus miembros con una API key de una cuenta de servicio. */
  @Endpoint(ListMembersRoute, { auth: [AuthMethod.Jwt, AuthMethod.ApiKey] })
  listMembers(@CurrentActor() actor: Actor | undefined): Promise<MemberPage> {
    return this.members.list(tenantOfActor(actor));
  }

  @Endpoint(RemoveMemberRoute)
  async removeMember(
    @Input() input: RemoveMemberRequest,
    @CurrentActor() actor: Actor | undefined,
  ): Promise<void> {
    await this.members.remove(
      tenantOfActor(actor),
      input.userId,
      await this.actorPermissions.of(actor),
    );
  }

  @Endpoint(SetMemberGroupsRoute)
  async setMemberGroups(
    @Input() input: SetMemberGroupsRequest,
    @CurrentActor() actor: Actor | undefined,
  ): Promise<void> {
    await this.members.setGroups(
      tenantOfActor(actor),
      input.userId,
      input.groupIds,
      await this.actorPermissions.of(actor),
    );
  }

  @Endpoint(ListGroupsRoute)
  listGroups(@CurrentActor() actor: Actor | undefined): Promise<GroupPage> {
    return this.groups.list(tenantOfActor(actor));
  }

  @Endpoint(CreateGroupRoute)
  createGroup(
    @Input() input: CreateGroupRequest,
    @CurrentActor() actor: Actor | undefined,
  ): Promise<GroupSummary> {
    return this.groups.create(tenantOfActor(actor), input.name);
  }

  @Endpoint(UpdateGroupRoute)
  updateGroup(
    @Input() input: UpdateGroupRequest,
    @CurrentActor() actor: Actor | undefined,
  ): Promise<GroupSummary> {
    return this.groups.rename(tenantOfActor(actor), input.groupId, input.name);
  }

  @Endpoint(DeleteGroupRoute)
  async deleteGroup(
    @Input() input: DeleteGroupRequest,
    @CurrentActor() actor: Actor | undefined,
  ): Promise<void> {
    await this.groups.delete(
      tenantOfActor(actor),
      input.groupId,
      await this.actorPermissions.of(actor),
    );
  }

  @Endpoint(SetGroupRolesRoute)
  async setGroupRoles(
    @Input() input: SetGroupRolesRequest,
    @CurrentActor() actor: Actor | undefined,
  ): Promise<void> {
    await this.groups.setRoles(
      tenantOfActor(actor),
      input.groupId,
      input.roleIds,
      await this.actorPermissions.of(actor),
    );
  }

  @Endpoint(ListRolesRoute)
  listRoles(@CurrentActor() actor: Actor | undefined): Promise<RolePage> {
    return this.roles.list(tenantOfActor(actor));
  }

  @Endpoint(CreateRoleRoute)
  async createRole(
    @Input() input: CreateRoleRequest,
    @CurrentActor() actor: Actor | undefined,
  ): Promise<RoleSummary> {
    return this.roles.create(
      tenantOfActor(actor),
      input.name,
      input.permissions,
      await this.actorPermissions.of(actor),
    );
  }

  @Endpoint(UpdateRoleRoute)
  async updateRole(
    @Input() input: UpdateRoleRequest,
    @CurrentActor() actor: Actor | undefined,
  ): Promise<RoleSummary> {
    return this.roles.update(
      tenantOfActor(actor),
      input,
      await this.actorPermissions.of(actor),
    );
  }

  @Endpoint(DeleteRoleRoute)
  async deleteRole(
    @Input() input: DeleteRoleRequest,
    @CurrentActor() actor: Actor | undefined,
  ): Promise<void> {
    await this.roles.delete(
      tenantOfActor(actor),
      input.roleId,
      await this.actorPermissions.of(actor),
    );
  }
}
