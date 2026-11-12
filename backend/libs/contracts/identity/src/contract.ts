import { defineServiceContract } from '@contracts/platform';
import { IdentityLimits, MfaRules } from './constants/identity.constants.js';
import {
  FeatureFlag,
  Permission,
  PlanFeature,
  PlatformRole,
} from './enums/access.enum.js';
import {
  ClientPlatform,
  MfaFactor,
  RevocationReason,
  RevocationScope,
  SignInStatus,
} from './enums/auth.enum.js';
import {
  IdentityErrorCode,
  IdentityEvent,
  IdentityOperation,
  IdentityRoute,
} from './enums/identifiers.enum.js';
import { identityErrorCatalog } from './errors/identity-error-catalog.js';
import {
  SessionRevokedEvent,
  TokensRevokedEvent,
} from './events/identity.events.js';
import { SignInRoute, VerifyMfaRoute } from './http/auth.routes.js';
import {
  ListDevicesRoute,
  ListSessionsRoute,
  RevokeOtherSessionsRoute,
  RevokeSessionRoute,
} from './http/session.routes.js';
import {
  GetUserAccessOperation,
  RevokeUserSessionsOperation,
} from './internal/identity.operations.js';
import {
  MfaFactorSchema,
  MfaVerifyRequestSchema,
  PendingMfaSchema,
  SessionTokensSchema,
  SignInRequestSchema,
  SignInResponseSchema,
  SignInStatusSchema,
} from './schemas/auth.schema.js';
import {
  ClientPlatformSchema,
  DevicePageSchema,
  DeviceSummarySchema,
  FeatureFlagSchema,
  GetUserAccessInputSchema,
  PermissionSchema,
  PlanFeatureSchema,
  PlatformRoleSchema,
  RevocationReasonSchema,
  RevocationScopeSchema,
  RevokedSessionsSchema,
  RevokeSessionRequestSchema,
  RevokeUserSessionsInputSchema,
  SessionPageSchema,
  SessionRevokedPayloadSchema,
  SessionSummarySchema,
  TokensRevokedPayloadSchema,
  UserAccessSchema,
} from './schemas/session.schema.js';

/** Contrato del servicio identity: acceso, sesiones, dispositivos y MFA. */
export const identityContract = defineServiceContract({
  service: 'identity',
  description:
    'Identidad: inicio de sesión, MFA, sesiones, dispositivos y enums de acceso.',
  enums: {
    Permission,
    PlatformRole,
    PlanFeature,
    FeatureFlag,
    MfaFactor,
    SignInStatus,
    ClientPlatform,
    RevocationReason,
    RevocationScope,
    IdentityErrorCode,
    IdentityRoute,
    IdentityOperation,
    IdentityEvent,
  },
  constants: { IdentityLimits, MfaRules },
  schemas: {
    Permission: PermissionSchema,
    PlatformRole: PlatformRoleSchema,
    PlanFeature: PlanFeatureSchema,
    FeatureFlag: FeatureFlagSchema,
    MfaFactor: MfaFactorSchema,
    SignInStatus: SignInStatusSchema,
    ClientPlatform: ClientPlatformSchema,
    RevocationReason: RevocationReasonSchema,
    RevocationScope: RevocationScopeSchema,
    SignInRequest: SignInRequestSchema,
    SessionTokens: SessionTokensSchema,
    PendingMfa: PendingMfaSchema,
    SignInResponse: SignInResponseSchema,
    MfaVerifyRequest: MfaVerifyRequestSchema,
    SessionSummary: SessionSummarySchema,
    SessionPage: SessionPageSchema,
    DeviceSummary: DeviceSummarySchema,
    DevicePage: DevicePageSchema,
    RevokeSessionRequest: RevokeSessionRequestSchema,
    RevokedSessions: RevokedSessionsSchema,
    RevokeUserSessionsInput: RevokeUserSessionsInputSchema,
    GetUserAccessInput: GetUserAccessInputSchema,
    UserAccess: UserAccessSchema,
    SessionRevokedPayload: SessionRevokedPayloadSchema,
    TokensRevokedPayload: TokensRevokedPayloadSchema,
  },
  routes: {
    signIn: SignInRoute,
    verifyMfa: VerifyMfaRoute,
    listSessions: ListSessionsRoute,
    revokeSession: RevokeSessionRoute,
    revokeOtherSessions: RevokeOtherSessionsRoute,
    listDevices: ListDevicesRoute,
  },
  operations: {
    revokeUserSessions: RevokeUserSessionsOperation,
    getUserAccess: GetUserAccessOperation,
  },
  events: {
    sessionRevoked: SessionRevokedEvent,
    tokensRevoked: TokensRevokedEvent,
  },
  errors: { IdentityErrorCode: identityErrorCatalog },
});
