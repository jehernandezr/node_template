import { z } from 'zod';
import {
  CursorSchema,
  IdSchema,
  PageLimitSchema,
  pageOf,
  TimestampSchema,
} from '@contracts/platform';
import { IdentityLimits } from '../constants/identity.constants.js';
import {
  ApiKeyEnvironment,
  ApiKeyStatus,
  ServiceAccountStatus,
} from '../enums/api-key.enum.js';
import type {
  ApiKeyPage,
  ApiKeyPrincipal,
  ApiKeySummary,
  AuthenticateApiKeyInput,
  CreatedApiKey,
  CreateApiKeyRequest,
  CreateServiceAccountRequest,
  DeleteServiceAccountRequest,
  ListApiKeysRequest,
  RevokeApiKeyRequest,
  RotateApiKeyRequest,
  ServiceAccountPage,
  ServiceAccountSummary,
  UpdateServiceAccountRequest,
} from '../types/api-key.type.js';
import { PermissionSchema } from './session.schema.js';

export const ApiKeyEnvironmentSchema = z
  .enum(ApiKeyEnvironment)
  .describe(
    'Environment of an API key.',
  ) satisfies z.ZodType<ApiKeyEnvironment>;

export const ApiKeyStatusSchema = z
  .enum(ApiKeyStatus)
  .describe('Status of an API key.') satisfies z.ZodType<ApiKeyStatus>;

export const ServiceAccountStatusSchema = z
  .enum(ServiceAccountStatus)
  .describe(
    'Status of a service account.',
  ) satisfies z.ZodType<ServiceAccountStatus>;

const ServiceAccountNameFieldSchema = z
  .string()
  .min(1)
  .max(IdentityLimits.serviceAccountNameMaxLength);

const PinnedApiVersionFieldSchema = z
  .string()
  .min(1)
  .max(IdentityLimits.pinnedApiVersionMaxLength);

const CidrFieldSchema = z
  .string()
  .min(1)
  .max(IdentityLimits.apiKeyCidrMaxLength);

const AllowedCidrsSchema = z
  .array(CidrFieldSchema)
  .max(IdentityLimits.maxApiKeyCidrs);

export const ServiceAccountSummarySchema = z
  .object({
    id: IdSchema,
    name: ServiceAccountNameFieldSchema,
    permissions: z
      .array(PermissionSchema)
      .max(IdentityLimits.maxPermissionsPerRole),
    status: ServiceAccountStatusSchema,
    pinnedApiVersion: PinnedApiVersionFieldSchema.nullable(),
    createdAt: TimestampSchema,
  })
  .describe(
    'Non-human tenant identity that uses API keys.',
  ) satisfies z.ZodType<ServiceAccountSummary>;

export const ServiceAccountPageSchema = pageOf(
  ServiceAccountSummarySchema,
  'Page of service accounts.',
) satisfies z.ZodType<ServiceAccountPage>;

export const CreateServiceAccountRequestSchema = z
  .strictObject({
    name: ServiceAccountNameFieldSchema,
    permissions: z
      .array(PermissionSchema)
      .max(IdentityLimits.maxPermissionsPerRole),
    pinnedApiVersion: PinnedApiVersionFieldSchema.optional(),
  })
  .describe(
    'Service account creation.',
  ) satisfies z.ZodType<CreateServiceAccountRequest>;

export const UpdateServiceAccountRequestSchema = z
  .strictObject({
    serviceAccountId: IdSchema,
    name: ServiceAccountNameFieldSchema.optional(),
    permissions: z
      .array(PermissionSchema)
      .max(IdentityLimits.maxPermissionsPerRole)
      .optional(),
  })
  .describe(
    'Partial changes of a service account.',
  ) satisfies z.ZodType<UpdateServiceAccountRequest>;

export const DeleteServiceAccountRequestSchema = z
  .strictObject({ serviceAccountId: IdSchema })
  .describe(
    'Deletion of a service account with its API keys.',
  ) satisfies z.ZodType<DeleteServiceAccountRequest>;

export const ApiKeySummarySchema = z
  .object({
    id: IdSchema,
    serviceAccountId: IdSchema,
    prefix: z
      .string()
      .min(IdentityLimits.apiKeyPrefixLength)
      .max(IdentityLimits.apiKeyPrefixLength)
      .regex(/^[A-Z2-7]+$/),
    environment: ApiKeyEnvironmentSchema,
    status: ApiKeyStatusSchema,
    expiresAt: TimestampSchema.nullable(),
    validUntil: TimestampSchema.nullable(),
    allowedCidrs: AllowedCidrsSchema,
    lastUsedAt: TimestampSchema.nullable(),
    createdAt: TimestampSchema,
  })
  .describe('API key without its secret.') satisfies z.ZodType<ApiKeySummary>;

export const ApiKeyPageSchema = pageOf(
  ApiKeySummarySchema,
  'Page of API keys.',
) satisfies z.ZodType<ApiKeyPage>;

export const ListApiKeysRequestSchema = z
  .strictObject({
    serviceAccountId: IdSchema,
    limit: PageLimitSchema.optional(),
    after: CursorSchema.optional(),
  })
  .describe(
    'Listing of the API keys of a service account.',
  ) satisfies z.ZodType<ListApiKeysRequest>;

export const CreateApiKeyRequestSchema = z
  .strictObject({
    serviceAccountId: IdSchema,
    environment: ApiKeyEnvironmentSchema,
    expiresAt: TimestampSchema.optional(),
    allowedCidrs: AllowedCidrsSchema.optional(),
  })
  .describe('API key creation.') satisfies z.ZodType<CreateApiKeyRequest>;

export const CreatedApiKeySchema = z
  .object({
    apiKey: ApiKeySummarySchema,
    secret: z.string().min(1).max(IdentityLimits.apiKeySecretMaxLength),
  })
  .describe(
    'API key created. The secret appears only in this response.',
  ) satisfies z.ZodType<CreatedApiKey>;

export const RotateApiKeyRequestSchema = z
  .strictObject({ apiKeyId: IdSchema })
  .describe('Rotation of an API key.') satisfies z.ZodType<RotateApiKeyRequest>;

export const RevokeApiKeyRequestSchema = z
  .strictObject({ apiKeyId: IdSchema })
  .describe(
    'Immediate revocation of an API key.',
  ) satisfies z.ZodType<RevokeApiKeyRequest>;

export const AuthenticateApiKeyInputSchema = z
  .strictObject({
    apiKey: z.string().min(1).max(IdentityLimits.apiKeyInputMaxLength),
    clientIp: z
      .string()
      .min(1)
      .max(IdentityLimits.clientIpMaxLength)
      .optional(),
  })
  .describe(
    'Validates an API key presented by a client.',
  ) satisfies z.ZodType<AuthenticateApiKeyInput>;

export const ApiKeyPrincipalSchema = z
  .object({
    apiKeyId: IdSchema,
    serviceAccountId: IdSchema,
    tenantId: IdSchema,
    permissions: z
      .array(PermissionSchema)
      .max(IdentityLimits.maxPermissionsPerRole),
    environment: ApiKeyEnvironmentSchema,
    expiresAt: TimestampSchema.nullable(),
    pinnedApiVersion: PinnedApiVersionFieldSchema.nullable(),
  })
  .describe(
    'Principal resulting from validating an API key.',
  ) satisfies z.ZodType<ApiKeyPrincipal>;
