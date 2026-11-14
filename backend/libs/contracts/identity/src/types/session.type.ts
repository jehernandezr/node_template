import type { Page } from '@contracts/platform';
import type {
  FeatureFlag,
  Permission,
  PlanFeature,
  PlatformRole,
} from '../enums/access.enum.js';
import type {
  ClientPlatform,
  RevocationReason,
  RevocationScope,
} from '../enums/auth.enum.js';

/** Sesión activa del usuario en un dispositivo. */
export interface SessionSummary {
  id: string;
  deviceName: string;
  platform: ClientPlatform;
  lastSeenAt: string;
  /** Verdadero para la sesión que hace la petición. */
  current: boolean;
}

/** Dispositivo con confianza vigente. */
export interface DeviceSummary {
  id: string;
  name: string;
  platform: ClientPlatform;
  lastSeenAt: string;
  trustedUntil?: string;
  /** Verdadero para el dispositivo registrado que aprueba acciones sensibles. */
  verifier: boolean;
}

export type SessionPage = Page<SessionSummary>;
export type DevicePage = Page<DeviceSummary>;

/** Petición que identifica una sesión. */
export interface RevokeSessionRequest {
  sessionId: string;
}

/** Cantidad de sesiones cerradas. */
export interface RevokedSessions {
  revoked: number;
}

/** Entrada de la operación interna que revoca las sesiones de un usuario. */
export interface RevokeUserSessionsInput {
  userId: string;
  reason: RevocationReason;
}

/** Entrada de la operación interna que lee el acceso de un usuario. */
export interface GetUserAccessInput {
  userId: string;
  tenantId: string;
}

/** Acceso efectivo de un usuario en un tenant. */
export interface UserAccess {
  permissions: Permission[];
  platformRoles: PlatformRole[];
  features: PlanFeature[];
  flags: FeatureFlag[];
}

/**
 * Acceso de la sesión actual: de aquí se llena la sesión del front
 * (usuario, tenant, roles, permisos, plan, flags y último MFA).
 */
export interface SessionAccess extends UserAccess {
  userId: string;
  tenantId: string;
  sessionId: string;
  /** Instante ISO 8601 del último segundo factor de la sesión, o null si nunca. */
  mfaVerifiedAt: string | null;
}

/** Payload de `identity.session.revoked.v1`. */
export interface SessionRevokedPayload {
  sessionId: string;
  userId: string;
  tenantId: string;
  reason: RevocationReason;
  revokedAt: string;
}

/** Payload de `identity.tokens.revoked.v1`. */
export interface TokensRevokedPayload {
  scope: RevocationScope;
  /** Sesión, usuario o tenant según `scope`. */
  subjectId: string;
  /** Se rechaza todo token emitido antes de este instante. */
  revokedBefore: string;
}
