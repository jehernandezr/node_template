import { CurrentActor, Endpoint, Input, Resource } from '@platform/http/nest';
import type { Actor } from '@platform/auth';
import { AuthMethod } from '@platform/http';
import type { PageQuery } from '@contracts/platform';
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

/** HTTP edge of the access of the active tenant: the session access, members, groups and roles. */
@Resource(IdentityResource.Access)
export class AccessController {
  constructor(
    private readonly sessionAccess: GetSessionAccess,
    private readonly members: ManageMembers,
    private readonly groups: ManageGroups,
    private readonly roles: ManageRoles,
    private readonly actorPermissions: ActorPermissions,
  ) {}

  /**
   * Reads the access of the caller's session.
   * @param actor Caller.
   * @returns The session access.
   */
  @Endpoint(GetSessionAccessRoute)
  getSessionAccess(
    @CurrentActor() actor: Actor | undefined,
  ): Promise<SessionAccess> {
    return this.sessionAccess.execute(requireUserActor(actor));
  }

  /**
   * Lists a page of members; an integration of the tenant reads it with an API key.
   * @param input Page size and cursor.
   * @param actor Caller.
   * @returns The page of members.
   */
  @Endpoint(ListMembersRoute, { auth: [AuthMethod.Jwt, AuthMethod.ApiKey] })
  listMembers(
    @Input() input: PageQuery,
    @CurrentActor() actor: Actor | undefined,
  ): Promise<MemberPage> {
    return this.members.list(tenantOfActor(actor), input);
  }

  /**
   * Removes a member of the tenant.
   * @param input Member to remove.
   * @param actor Caller.
   */
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

  /**
   * Replaces the groups of a member.
   * @param input Member and groups.
   * @param actor Caller.
   */
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

  /**
   * Lists the groups of the tenant.
   * @param actor Caller.
   * @returns The groups.
   */
  @Endpoint(ListGroupsRoute)
  listGroups(@CurrentActor() actor: Actor | undefined): Promise<GroupPage> {
    return this.groups.list(tenantOfActor(actor));
  }

  /**
   * Creates a group.
   * @param input Name.
   * @param actor Caller.
   * @returns The group.
   */
  @Endpoint(CreateGroupRoute)
  createGroup(
    @Input() input: CreateGroupRequest,
    @CurrentActor() actor: Actor | undefined,
  ): Promise<GroupSummary> {
    return this.groups.create(tenantOfActor(actor), input.name);
  }

  /**
   * Renames a group.
   * @param input Group and name.
   * @param actor Caller.
   * @returns The group.
   */
  @Endpoint(UpdateGroupRoute)
  updateGroup(
    @Input() input: UpdateGroupRequest,
    @CurrentActor() actor: Actor | undefined,
  ): Promise<GroupSummary> {
    return this.groups.rename(tenantOfActor(actor), input.groupId, input.name);
  }

  /**
   * Deletes a group.
   * @param input Group.
   * @param actor Caller.
   */
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

  /**
   * Replaces the roles of a group.
   * @param input Group and roles.
   * @param actor Caller.
   */
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

  /**
   * Lists the roles of the tenant.
   * @param actor Caller.
   * @returns The roles.
   */
  @Endpoint(ListRolesRoute)
  listRoles(@CurrentActor() actor: Actor | undefined): Promise<RolePage> {
    return this.roles.list(tenantOfActor(actor));
  }

  /**
   * Creates a custom role.
   * @param input Name and permissions.
   * @param actor Caller.
   * @returns The role.
   */
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

  /**
   * Renames a role or changes its permissions.
   * @param input Role and fields to change.
   * @param actor Caller.
   * @returns The role.
   */
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

  /**
   * Deletes a custom role.
   * @param input Role.
   * @param actor Caller.
   */
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
