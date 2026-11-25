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

/** Active user session on a device. */
export interface SessionSummary {
  id: string;
  deviceName: string;
  platform: ClientPlatform;
  lastSeenAt: string;
  /** True for the session making the request. */
  current: boolean;
}

/** Device with current trust. */
export interface DeviceSummary {
  id: string;
  name: string;
  platform: ClientPlatform;
  lastSeenAt: string;
  trustedUntil?: string;
  /** True for the registered device that approves sensitive actions. */
  verifier: boolean;
}

export type SessionPage = Page<SessionSummary>;
export type DevicePage = Page<DeviceSummary>;

/** Request that identifies a session. */
export interface RevokeSessionRequest {
  sessionId: string;
}

/** Number of closed sessions. */
export interface RevokedSessions {
  revoked: number;
}

/** Input of the internal operation that revokes a user's sessions. */
export interface RevokeUserSessionsInput {
  userId: string;
  reason: RevocationReason;
}

/** Input of the internal operation that reads a user's access. */
export interface GetUserAccessInput {
  userId: string;
  tenantId: string;
}

/** Effective access of a user in a tenant. */
export interface UserAccess {
  permissions: Permission[];
  /** Names of the user's roles in the tenant. */
  roles: string[];
  /** Permissions version `<tenant version>.<user version>`: the `pv` claim. */
  permissionVersion: string;
  platformRoles: PlatformRole[];
  features: PlanFeature[];
  flags: FeatureFlag[];
}

/**
 * Access of the current session: the front session is filled from here
 * (user, tenant, roles, permissions, plan, flags and last MFA).
 */
export interface SessionAccess extends UserAccess {
  userId: string;
  tenantId: string;
  sessionId: string;
  /** ISO 8601 instant of the session's last second factor, or null if never. */
  mfaVerifiedAt: string | null;
}

/** Payload of `identity.session.revoked.v1`. */
export interface SessionRevokedPayload {
  sessionId: string;
  userId: string;
  tenantId: string;
  reason: RevocationReason;
  revokedAt: string;
}

/** Payload of `identity.tokens.revoked.v1`. */
export interface TokensRevokedPayload {
  scope: RevocationScope;
  /** Session, user or tenant depending on `scope`. */
  subjectId: string;
  /** Every token issued before this instant is rejected. */
  revokedBefore: string;
}
