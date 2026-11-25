import {
  Access,
  defineRoute,
  HttpMethod,
  PageQuerySchema,
  PlatformErrorCode,
} from '@contracts/platform';
import { IdentityErrorCode, IdentityRoute } from '../enums/identifiers.enum.js';
import { Permission } from '../enums/access.enum.js';
import { TenantCreationSchema } from '../schemas/orchestration.schema.js';
import {
  CreateTenantRequestSchema,
  MyTenantPageSchema,
  TenantSummarySchema,
  UpdateTenantRequestSchema,
} from '../schemas/tenant.schema.js';
import { SessionGuardErrors } from './session-guard.errors.js';

/**
 * `POST /v1/tenants`: creates a tenant and makes the user its owner. The tenant is
 * provisioned in a saga: responds 202 and the client polls `GET /v1/sagas/{sagaId}`.
 */
export const CreateTenantRoute = defineRoute({
  id: IdentityRoute.CreateTenant,
  method: HttpMethod.Post,
  path: '/v1/tenants',
  request: CreateTenantRequestSchema,
  response: TenantCreationSchema,
  successStatus: 202,
  errors: [...SessionGuardErrors, IdentityErrorCode.TenantSlugTaken],
  access: Access.authenticated(),
  description:
    'Starts provisioning a tenant and makes the authenticated user its owner.',
});

/** `GET /v1/tenant`: tenant of the current session. */
export const GetTenantRoute = defineRoute({
  id: IdentityRoute.GetTenant,
  method: HttpMethod.Get,
  path: '/v1/tenant',
  response: TenantSummarySchema,
  errors: SessionGuardErrors,
  access: Access.authenticated(),
  description: 'Returns the tenant of the current session.',
});

/** `PATCH /v1/tenant`: changes the name of the current session's tenant. */
export const UpdateTenantRoute = defineRoute({
  id: IdentityRoute.UpdateTenant,
  method: HttpMethod.Patch,
  path: '/v1/tenant',
  request: UpdateTenantRequestSchema,
  response: TenantSummarySchema,
  errors: [...SessionGuardErrors, PlatformErrorCode.AuthForbidden],
  access: Access.authenticated({
    permissions: [Permission.IdentityTenantManage],
  }),
  description: 'Changes the name of the current session tenant.',
});

/** `GET /v1/me/tenants`: tenants the user belongs to. */
export const ListMyTenantsRoute = defineRoute({
  id: IdentityRoute.ListMyTenants,
  method: HttpMethod.Get,
  path: '/v1/me/tenants',
  request: PageQuerySchema,
  response: MyTenantPageSchema,
  errors: SessionGuardErrors,
  access: Access.authenticated(),
  description: 'Lists the tenants the user belongs to.',
});
