import { z } from 'zod';
import { IdSchema, pageOf, TimestampSchema } from '@contracts/platform';
import { IdentityLimits } from '../constants/identity.constants.js';
import { Permission } from '../enums/access.enum.js';
import type {
  CreateGroupRequest,
  CreateRoleRequest,
  DeleteGroupRequest,
  DeleteRoleRequest,
  GroupPage,
  GroupSummary,
  MemberPage,
  MemberSummary,
  RemoveMemberRequest,
  RolePage,
  RoleSummary,
  SetGroupRolesRequest,
  SetMemberGroupsRequest,
  UpdateGroupRequest,
  UpdateRoleRequest,
} from '../types/access.type.js';
import { TenantRoleSchema } from './tenant.schema.js';

const GroupIdsSchema = z.array(IdSchema).max(IdentityLimits.maxGroupsPerMember);

const GroupNameFieldSchema = z
  .string()
  .min(1)
  .max(IdentityLimits.groupNameMaxLength);

const RoleNameFieldSchema = z
  .string()
  .min(1)
  .max(IdentityLimits.roleNameMaxLength);

const PermissionsSchema = z
  .array(z.enum(Permission))
  .max(IdentityLimits.maxPermissionsPerRole);

export const MemberSummarySchema = z
  .object({
    userId: IdSchema,
    email: z.email().max(IdentityLimits.emailMaxLength),
    displayName: z.string().min(1).max(IdentityLimits.displayNameMaxLength),
    groupIds: GroupIdsSchema,
    joinedAt: TimestampSchema,
  })
  .describe(
    'Tenant member with their groups.',
  ) satisfies z.ZodType<MemberSummary>;

export const MemberPageSchema = pageOf(
  MemberSummarySchema,
  'Page of members.',
) satisfies z.ZodType<MemberPage>;

export const RemoveMemberRequestSchema = z
  .strictObject({ userId: IdSchema })
  .describe(
    'Member to remove from the tenant.',
  ) satisfies z.ZodType<RemoveMemberRequest>;

export const SetMemberGroupsRequestSchema = z
  .strictObject({ userId: IdSchema, groupIds: GroupIdsSchema })
  .describe(
    'Replacement of the groups of a member.',
  ) satisfies z.ZodType<SetMemberGroupsRequest>;

export const GroupSummarySchema = z
  .object({
    id: IdSchema,
    name: GroupNameFieldSchema,
    system: z.boolean(),
    roleIds: z.array(IdSchema).max(IdentityLimits.maxRolesPerUser),
    memberCount: z.int().min(0),
  })
  .describe('Tenant group.') satisfies z.ZodType<GroupSummary>;

export const GroupPageSchema = pageOf(
  GroupSummarySchema,
  'Page of groups.',
) satisfies z.ZodType<GroupPage>;

export const CreateGroupRequestSchema = z
  .strictObject({ name: GroupNameFieldSchema })
  .describe('Group creation.') satisfies z.ZodType<CreateGroupRequest>;

export const UpdateGroupRequestSchema = z
  .strictObject({ groupId: IdSchema, name: GroupNameFieldSchema })
  .describe('Group rename.') satisfies z.ZodType<UpdateGroupRequest>;

export const DeleteGroupRequestSchema = z
  .strictObject({ groupId: IdSchema })
  .describe('Group deletion.') satisfies z.ZodType<DeleteGroupRequest>;

export const SetGroupRolesRequestSchema = z
  .strictObject({
    groupId: IdSchema,
    roleIds: z.array(IdSchema).max(IdentityLimits.maxRolesPerUser),
  })
  .describe(
    'Replacement of the roles of a group.',
  ) satisfies z.ZodType<SetGroupRolesRequest>;

export const RoleSummarySchema = z
  .object({
    id: IdSchema,
    name: RoleNameFieldSchema,
    systemRole: TenantRoleSchema.nullable(),
    permissions: PermissionsSchema,
  })
  .describe(
    'Tenant role with its permissions.',
  ) satisfies z.ZodType<RoleSummary>;

export const RolePageSchema = pageOf(
  RoleSummarySchema,
  'Page of roles.',
) satisfies z.ZodType<RolePage>;

export const CreateRoleRequestSchema = z
  .strictObject({
    name: RoleNameFieldSchema,
    permissions: PermissionsSchema,
  })
  .describe('Custom role creation.') satisfies z.ZodType<CreateRoleRequest>;

export const UpdateRoleRequestSchema = z
  .strictObject({
    roleId: IdSchema,
    name: RoleNameFieldSchema.optional(),
    permissions: PermissionsSchema.optional(),
  })
  .describe(
    'Partial changes of a role.',
  ) satisfies z.ZodType<UpdateRoleRequest>;

export const DeleteRoleRequestSchema = z
  .strictObject({ roleId: IdSchema })
  .describe('Role deletion.') satisfies z.ZodType<DeleteRoleRequest>;
