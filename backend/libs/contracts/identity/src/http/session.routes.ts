import {
  Access,
  defineRoute,
  HttpMethod,
  PageQuerySchema,
  PlatformErrorCode,
} from '@contracts/platform';
import { IdentityErrorCode, IdentityRoute } from '../enums/identifiers.enum.js';
import {
  DevicePageSchema,
  SessionAccessSchema,
  RevokedSessionsSchema,
  RevokeSessionRequestSchema,
  SessionPageSchema,
} from '../schemas/session.schema.js';
import { SessionTokensSchema } from '../schemas/auth.schema.js';
import { SwitchTenantRequestSchema } from '../schemas/tenant.schema.js';
import { SessionGuardErrors } from './session-guard.errors.js';

/** `GET /v1/me/access`: access of the current session, to fill the front-end session. */
export const GetSessionAccessRoute = defineRoute({
  id: IdentityRoute.GetSessionAccess,
  method: HttpMethod.Get,
  path: '/v1/me/access',
  response: SessionAccessSchema,
  errors: SessionGuardErrors,
  access: Access.authenticated(),
  description:
    'Returns user, tenant, permissions, roles, plan, flags and last MFA of the current session.',
});

/** `GET /v1/me/sessions`: the user's active sessions. */
export const ListSessionsRoute = defineRoute({
  id: IdentityRoute.ListSessions,
  method: HttpMethod.Get,
  path: '/v1/me/sessions',
  request: PageQuerySchema,
  response: SessionPageSchema,
  errors: SessionGuardErrors,
  access: Access.authenticated(),
  description: 'Lists the active sessions of the user, current one first.',
});

/** `DELETE /v1/me/sessions/{sessionId}`: closes a remote session. */
export const RevokeSessionRoute = defineRoute({
  id: IdentityRoute.RevokeSession,
  method: HttpMethod.Delete,
  path: '/v1/me/sessions/{sessionId}',
  request: RevokeSessionRequestSchema,
  errors: [...SessionGuardErrors, PlatformErrorCode.ResourceNotFound],
  access: Access.authenticated(),
  description: 'Closes a session of the user and revokes its tokens.',
});

/** `POST /v1/me/sessions/revoke-others`: closes all sessions except the current one. */
export const RevokeOtherSessionsRoute = defineRoute({
  id: IdentityRoute.RevokeOtherSessions,
  method: HttpMethod.Post,
  path: '/v1/me/sessions/revoke-others',
  response: RevokedSessionsSchema,
  errors: SessionGuardErrors,
  access: Access.authenticated(),
  description: 'Closes all sessions of the user except the current one.',
});

/** `GET /v1/me/devices`: devices with current trust. */
export const ListDevicesRoute = defineRoute({
  id: IdentityRoute.ListDevices,
  method: HttpMethod.Get,
  path: '/v1/me/devices',
  request: PageQuerySchema,
  response: DevicePageSchema,
  errors: SessionGuardErrors,
  access: Access.authenticated(),
  description: 'Lists the user devices with active trust.',
});

/**
 * `POST /v1/me/tenant-switch`: changes the tenant of the open session. Responds with
 * new tokens for the chosen tenant.
 */
export const SwitchTenantRoute = defineRoute({
  id: IdentityRoute.SwitchTenant,
  method: HttpMethod.Post,
  path: '/v1/me/tenant-switch',
  request: SwitchTenantRequestSchema,
  response: SessionTokensSchema,
  errors: [...SessionGuardErrors, IdentityErrorCode.TenantNotMember],
  access: Access.authenticated(),
  description:
    'Switches the tenant of the open session and returns tokens for the chosen tenant.',
});
