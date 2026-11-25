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
  ApiKeyPageSchema,
  CreatedApiKeySchema,
  CreateApiKeyRequestSchema,
  CreateServiceAccountRequestSchema,
  DeleteServiceAccountRequestSchema,
  ListApiKeysRequestSchema,
  RevokeApiKeyRequestSchema,
  RotateApiKeyRequestSchema,
  ServiceAccountPageSchema,
  ServiceAccountSummarySchema,
  UpdateServiceAccountRequestSchema,
} from '../schemas/api-key.schema.js';
import { SessionGuardErrors } from './session-guard.errors.js';

const forbidden = [...SessionGuardErrors, PlatformErrorCode.AuthForbidden];

/** `GET /v1/tenant/service-accounts`: service accounts of the tenant. */
export const ListServiceAccountsRoute = defineRoute({
  id: IdentityRoute.ListServiceAccounts,
  method: HttpMethod.Get,
  path: '/v1/tenant/service-accounts',
  request: PageQuerySchema,
  response: ServiceAccountPageSchema,
  errors: forbidden,
  access: Access.authenticated({
    permissions: [Permission.IdentityServiceAccountsManage],
  }),
  description: 'Lists the service accounts of the tenant.',
});

/** `POST /v1/tenant/service-accounts`: creates a service account. Requires a recent MFA. */
export const CreateServiceAccountRoute = defineRoute({
  id: IdentityRoute.CreateServiceAccount,
  method: HttpMethod.Post,
  path: '/v1/tenant/service-accounts',
  request: CreateServiceAccountRequestSchema,
  response: ServiceAccountSummarySchema,
  successStatus: 201,
  errors: [
    ...forbidden,
    IdentityErrorCode.MfaStepUpRequired,
    IdentityErrorCode.ApiKeyPermissionNotGrantable,
  ],
  access: Access.authenticated({
    permissions: [Permission.IdentityServiceAccountsManage],
    mfaMaxAgeMinutes: MfaRules.stepUpMaxAgeMinutes,
  }),
  description: 'Creates a service account with the given permissions.',
});

/** `PATCH /v1/tenant/service-accounts/{serviceAccountId}`: changes name or permissions. Requires a recent MFA. */
export const UpdateServiceAccountRoute = defineRoute({
  id: IdentityRoute.UpdateServiceAccount,
  method: HttpMethod.Patch,
  path: '/v1/tenant/service-accounts/{serviceAccountId}',
  request: UpdateServiceAccountRequestSchema,
  response: ServiceAccountSummarySchema,
  errors: [
    ...forbidden,
    IdentityErrorCode.MfaStepUpRequired,
    IdentityErrorCode.ApiKeyPermissionNotGrantable,
    PlatformErrorCode.ResourceNotFound,
  ],
  access: Access.authenticated({
    permissions: [Permission.IdentityServiceAccountsManage],
    mfaMaxAgeMinutes: MfaRules.stepUpMaxAgeMinutes,
  }),
  description: 'Changes the name or the permissions of a service account.',
});

/** `DELETE /v1/tenant/service-accounts/{serviceAccountId}`: deletes the service account and its API keys. */
export const DeleteServiceAccountRoute = defineRoute({
  id: IdentityRoute.DeleteServiceAccount,
  method: HttpMethod.Delete,
  path: '/v1/tenant/service-accounts/{serviceAccountId}',
  request: DeleteServiceAccountRequestSchema,
  errors: [...forbidden, PlatformErrorCode.ResourceNotFound],
  access: Access.authenticated({
    permissions: [Permission.IdentityServiceAccountsManage],
  }),
  description: 'Deletes a service account and revokes its API keys.',
});

/** `GET /v1/tenant/service-accounts/{serviceAccountId}/api-keys`: API keys of a service account. */
export const ListApiKeysRoute = defineRoute({
  id: IdentityRoute.ListApiKeys,
  method: HttpMethod.Get,
  path: '/v1/tenant/service-accounts/{serviceAccountId}/api-keys',
  request: ListApiKeysRequestSchema,
  response: ApiKeyPageSchema,
  errors: [...forbidden, PlatformErrorCode.ResourceNotFound],
  access: Access.authenticated({
    permissions: [Permission.IdentityApiKeysManage],
  }),
  description: 'Lists the API keys of a service account without their secrets.',
});

/** `POST /v1/tenant/service-accounts/{serviceAccountId}/api-keys`: creates an API key. Requires a recent MFA. */
export const CreateApiKeyRoute = defineRoute({
  id: IdentityRoute.CreateApiKey,
  method: HttpMethod.Post,
  path: '/v1/tenant/service-accounts/{serviceAccountId}/api-keys',
  request: CreateApiKeyRequestSchema,
  response: CreatedApiKeySchema,
  successStatus: 201,
  errors: [
    ...forbidden,
    IdentityErrorCode.MfaStepUpRequired,
    IdentityErrorCode.ApiKeyPermissionNotGrantable,
    IdentityErrorCode.ServiceAccountDisabled,
    PlatformErrorCode.ResourceNotFound,
  ],
  access: Access.authenticated({
    permissions: [Permission.IdentityApiKeysManage],
    mfaMaxAgeMinutes: MfaRules.stepUpMaxAgeMinutes,
  }),
  description:
    'Creates an API key whose account permissions the caller holds. The secret appears only in this response.',
});

/** `POST /v1/tenant/api-keys/{apiKeyId}/rotate`: rotates an API key. Requires a recent MFA. */
export const RotateApiKeyRoute = defineRoute({
  id: IdentityRoute.RotateApiKey,
  method: HttpMethod.Post,
  path: '/v1/tenant/api-keys/{apiKeyId}/rotate',
  request: RotateApiKeyRequestSchema,
  response: CreatedApiKeySchema,
  successStatus: 201,
  errors: [
    ...forbidden,
    IdentityErrorCode.MfaStepUpRequired,
    IdentityErrorCode.ServiceAccountDisabled,
    PlatformErrorCode.ResourceNotFound,
  ],
  access: Access.authenticated({
    permissions: [Permission.IdentityApiKeysManage],
    mfaMaxAgeMinutes: MfaRules.stepUpMaxAgeMinutes,
  }),
  description:
    'Rotates an active API key whose account permissions the caller holds: the new one appears once and the previous one stays valid for the grace period.',
});

/** `DELETE /v1/tenant/api-keys/{apiKeyId}`: revokes an API key at once. */
export const RevokeApiKeyRoute = defineRoute({
  id: IdentityRoute.RevokeApiKey,
  method: HttpMethod.Delete,
  path: '/v1/tenant/api-keys/{apiKeyId}',
  request: RevokeApiKeyRequestSchema,
  errors: [...forbidden, PlatformErrorCode.ResourceNotFound],
  access: Access.authenticated({
    permissions: [Permission.IdentityApiKeysManage],
  }),
  description: 'Revokes an API key at once.',
});
