import { IdentityErrorCode } from '../enums/identifiers.enum.js';

/**
 * Codes with which the guard rejects an access token on any authenticated
 * route, in the order it checks them: revoked session, user and tenant
 * epochs, suspensions and permission version. A session expired
 * by the absolute cap is also rejected here. All except
 * `IDENTITY.TOKEN.STALE_PERMISSIONS` end the session on the client.
 */
export const SessionGuardErrors = Object.freeze([
  IdentityErrorCode.SessionRevoked,
  IdentityErrorCode.SessionExpired,
  IdentityErrorCode.TokenRevoked,
  IdentityErrorCode.UserSuspended,
  IdentityErrorCode.TenantSuspended,
  IdentityErrorCode.TokenStalePermissions,
] as const);
