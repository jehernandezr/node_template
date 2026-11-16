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
    'Miembro del tenant con sus grupos.',
  ) satisfies z.ZodType<MemberSummary>;

export const MemberPageSchema = pageOf(
  MemberSummarySchema,
  'Página de miembros.',
) satisfies z.ZodType<MemberPage>;

export const RemoveMemberRequestSchema = z
  .strictObject({ userId: IdSchema })
  .describe(
    'Miembro a quitar del tenant.',
  ) satisfies z.ZodType<RemoveMemberRequest>;

export const SetMemberGroupsRequestSchema = z
  .strictObject({ userId: IdSchema, groupIds: GroupIdsSchema })
  .describe(
    'Reemplazo de los grupos de un miembro.',
  ) satisfies z.ZodType<SetMemberGroupsRequest>;

export const GroupSummarySchema = z
  .object({
    id: IdSchema,
    name: GroupNameFieldSchema,
    system: z.boolean(),
    roleIds: z.array(IdSchema).max(IdentityLimits.maxRolesPerUser),
    memberCount: z.int().min(0),
  })
  .describe('Grupo del tenant.') satisfies z.ZodType<GroupSummary>;

export const GroupPageSchema = pageOf(
  GroupSummarySchema,
  'Página de grupos.',
) satisfies z.ZodType<GroupPage>;

export const CreateGroupRequestSchema = z
  .strictObject({ name: GroupNameFieldSchema })
  .describe('Alta de un grupo.') satisfies z.ZodType<CreateGroupRequest>;

export const UpdateGroupRequestSchema = z
  .strictObject({ groupId: IdSchema, name: GroupNameFieldSchema })
  .describe(
    'Cambio de nombre de un grupo.',
  ) satisfies z.ZodType<UpdateGroupRequest>;

export const DeleteGroupRequestSchema = z
  .strictObject({ groupId: IdSchema })
  .describe('Borrado de un grupo.') satisfies z.ZodType<DeleteGroupRequest>;

export const SetGroupRolesRequestSchema = z
  .strictObject({
    groupId: IdSchema,
    roleIds: z.array(IdSchema).max(IdentityLimits.maxRolesPerUser),
  })
  .describe(
    'Reemplazo de los roles de un grupo.',
  ) satisfies z.ZodType<SetGroupRolesRequest>;

export const RoleSummarySchema = z
  .object({
    id: IdSchema,
    name: RoleNameFieldSchema,
    systemRole: TenantRoleSchema.nullable(),
    permissions: PermissionsSchema,
  })
  .describe(
    'Rol del tenant con sus permisos.',
  ) satisfies z.ZodType<RoleSummary>;

export const RolePageSchema = pageOf(
  RoleSummarySchema,
  'Página de roles.',
) satisfies z.ZodType<RolePage>;

export const CreateRoleRequestSchema = z
  .strictObject({
    name: RoleNameFieldSchema,
    permissions: PermissionsSchema,
  })
  .describe(
    'Alta de un rol personalizado.',
  ) satisfies z.ZodType<CreateRoleRequest>;

export const UpdateRoleRequestSchema = z
  .strictObject({
    roleId: IdSchema,
    name: RoleNameFieldSchema.optional(),
    permissions: PermissionsSchema.optional(),
  })
  .describe(
    'Cambios parciales de un rol.',
  ) satisfies z.ZodType<UpdateRoleRequest>;

export const DeleteRoleRequestSchema = z
  .strictObject({ roleId: IdSchema })
  .describe('Borrado de un rol.') satisfies z.ZodType<DeleteRoleRequest>;
