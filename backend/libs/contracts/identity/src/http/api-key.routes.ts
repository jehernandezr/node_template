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

/** `GET /v1/tenant/service-accounts`: service accounts del tenant. */
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
  description: 'Lista las service accounts del tenant.',
});

/** `POST /v1/tenant/service-accounts`: crea una service account. */
export const CreateServiceAccountRoute = defineRoute({
  id: IdentityRoute.CreateServiceAccount,
  method: HttpMethod.Post,
  path: '/v1/tenant/service-accounts',
  request: CreateServiceAccountRequestSchema,
  response: ServiceAccountSummarySchema,
  successStatus: 201,
  errors: [...forbidden, IdentityErrorCode.ApiKeyPermissionNotGrantable],
  access: Access.authenticated({
    permissions: [Permission.IdentityServiceAccountsManage],
  }),
  description: 'Crea una service account con los permisos indicados.',
});

/** `PATCH /v1/tenant/service-accounts/{serviceAccountId}`: cambia nombre o permisos. */
export const UpdateServiceAccountRoute = defineRoute({
  id: IdentityRoute.UpdateServiceAccount,
  method: HttpMethod.Patch,
  path: '/v1/tenant/service-accounts/{serviceAccountId}',
  request: UpdateServiceAccountRequestSchema,
  response: ServiceAccountSummarySchema,
  errors: [
    ...forbidden,
    IdentityErrorCode.ApiKeyPermissionNotGrantable,
    PlatformErrorCode.ResourceNotFound,
  ],
  access: Access.authenticated({
    permissions: [Permission.IdentityServiceAccountsManage],
  }),
  description: 'Cambia el nombre o los permisos de una service account.',
});

/** `DELETE /v1/tenant/service-accounts/{serviceAccountId}`: borra la service account y sus API keys. */
export const DeleteServiceAccountRoute = defineRoute({
  id: IdentityRoute.DeleteServiceAccount,
  method: HttpMethod.Delete,
  path: '/v1/tenant/service-accounts/{serviceAccountId}',
  request: DeleteServiceAccountRequestSchema,
  errors: [...forbidden, PlatformErrorCode.ResourceNotFound],
  access: Access.authenticated({
    permissions: [Permission.IdentityServiceAccountsManage],
  }),
  description: 'Borra una service account y revoca sus API keys.',
});

/** `GET /v1/tenant/service-accounts/{serviceAccountId}/api-keys`: API keys de una service account. */
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
  description: 'Lista las API keys de una service account sin sus secretos.',
});

/** `POST /v1/tenant/service-accounts/{serviceAccountId}/api-keys`: crea una API key. Exige MFA reciente. */
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
  description: 'Crea una API key. El secreto aparece solo en esta respuesta.',
});

/** `POST /v1/tenant/api-keys/{apiKeyId}/rotate`: rota una API key. Exige MFA reciente. */
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
    'Rota una API key: la nueva aparece una vez y la anterior sigue válida hasta su vencimiento.',
});

/** `DELETE /v1/tenant/api-keys/{apiKeyId}`: revoca una API key de inmediato. */
export const RevokeApiKeyRoute = defineRoute({
  id: IdentityRoute.RevokeApiKey,
  method: HttpMethod.Delete,
  path: '/v1/tenant/api-keys/{apiKeyId}',
  request: RevokeApiKeyRequestSchema,
  errors: [...forbidden, PlatformErrorCode.ResourceNotFound],
  access: Access.authenticated({
    permissions: [Permission.IdentityApiKeysManage],
  }),
  description: 'Revoca una API key de inmediato.',
});
