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
 * `POST /v1/tenants`: crea un tenant y deja al usuario como dueño. El tenant se
 * aprovisiona en una saga: responde 202 y el cliente consulta `GET /v1/sagas/{sagaId}`.
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
    'Inicia el aprovisionamiento de un tenant y deja al usuario autenticado como dueño.',
});

/** `GET /v1/tenant`: tenant de la sesión actual. */
export const GetTenantRoute = defineRoute({
  id: IdentityRoute.GetTenant,
  method: HttpMethod.Get,
  path: '/v1/tenant',
  response: TenantSummarySchema,
  errors: SessionGuardErrors,
  access: Access.authenticated(),
  description: 'Devuelve el tenant de la sesión actual.',
});

/** `PATCH /v1/tenant`: cambia el nombre del tenant de la sesión actual. */
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
  description: 'Cambia el nombre del tenant de la sesión actual.',
});

/** `GET /v1/me/tenants`: tenants a los que pertenece el usuario. */
export const ListMyTenantsRoute = defineRoute({
  id: IdentityRoute.ListMyTenants,
  method: HttpMethod.Get,
  path: '/v1/me/tenants',
  request: PageQuerySchema,
  response: MyTenantPageSchema,
  errors: SessionGuardErrors,
  access: Access.authenticated(),
  description: 'Lista los tenants a los que pertenece el usuario.',
});
