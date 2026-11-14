import {
  Access,
  defineRoute,
  HttpMethod,
  PageQuerySchema,
  PlatformErrorCode,
} from '@contracts/platform';
import { IdentityRoute } from '../enums/identifiers.enum.js';
import {
  DevicePageSchema,
  SessionAccessSchema,
  RevokedSessionsSchema,
  RevokeSessionRequestSchema,
  SessionPageSchema,
} from '../schemas/session.schema.js';
import { SessionGuardErrors } from './session-guard.errors.js';

/** `GET /v1/me/access`: acceso de la sesión actual, para llenar la sesión del front. */
export const GetSessionAccessRoute = defineRoute({
  id: IdentityRoute.GetSessionAccess,
  method: HttpMethod.Get,
  path: '/v1/me/access',
  response: SessionAccessSchema,
  errors: SessionGuardErrors,
  access: Access.authenticated(),
  description:
    'Devuelve usuario, tenant, permisos, roles, plan, flags y último MFA de la sesión actual.',
});

/** `GET /v1/me/sessions`: sesiones activas del usuario. */
export const ListSessionsRoute = defineRoute({
  id: IdentityRoute.ListSessions,
  method: HttpMethod.Get,
  path: '/v1/me/sessions',
  request: PageQuerySchema,
  response: SessionPageSchema,
  errors: SessionGuardErrors,
  access: Access.authenticated(),
  description: 'Lista las sesiones activas del usuario, la actual primero.',
});

/** `DELETE /v1/me/sessions/{sessionId}`: cierra una sesión remota. */
export const RevokeSessionRoute = defineRoute({
  id: IdentityRoute.RevokeSession,
  method: HttpMethod.Delete,
  path: '/v1/me/sessions/{sessionId}',
  request: RevokeSessionRequestSchema,
  errors: [...SessionGuardErrors, PlatformErrorCode.ResourceNotFound],
  access: Access.authenticated(),
  description: 'Cierra una sesión del usuario y revoca sus tokens.',
});

/** `POST /v1/me/sessions/revoke-others`: cierra todas las sesiones menos la actual. */
export const RevokeOtherSessionsRoute = defineRoute({
  id: IdentityRoute.RevokeOtherSessions,
  method: HttpMethod.Post,
  path: '/v1/me/sessions/revoke-others',
  response: RevokedSessionsSchema,
  errors: SessionGuardErrors,
  access: Access.authenticated(),
  description: 'Cierra todas las sesiones del usuario menos la actual.',
});

/** `GET /v1/me/devices`: dispositivos con confianza vigente. */
export const ListDevicesRoute = defineRoute({
  id: IdentityRoute.ListDevices,
  method: HttpMethod.Get,
  path: '/v1/me/devices',
  request: PageQuerySchema,
  response: DevicePageSchema,
  errors: SessionGuardErrors,
  access: Access.authenticated(),
  description: 'Lista los dispositivos del usuario con confianza vigente.',
});
