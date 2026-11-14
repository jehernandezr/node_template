import { IdentityErrorCode } from '../enums/identifiers.enum.js';

/**
 * Códigos con los que el guard rechaza un access token en cualquier ruta
 * autenticada, en el orden en que los revisa: sesión revocada, épocas del
 * usuario y del tenant, suspensiones y versión de permisos. La sesión vencida
 * por el tope absoluto también se rechaza aquí. Todos menos
 * `IDENTITY.TOKEN.STALE_PERMISSIONS` cierran la sesión en el cliente.
 */
export const SessionGuardErrors = Object.freeze([
  IdentityErrorCode.SessionRevoked,
  IdentityErrorCode.SessionExpired,
  IdentityErrorCode.TokenRevoked,
  IdentityErrorCode.UserSuspended,
  IdentityErrorCode.TenantSuspended,
  IdentityErrorCode.TokenStalePermissions,
] as const);
