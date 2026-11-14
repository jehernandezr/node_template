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
  IdentityTopic,
} from './enums/identifiers.enum.js';
import { identityErrorCatalog } from './errors/identity-error-catalog.js';
import {
  SessionRevokedEvent,
  TokensRevokedEvent,
} from './events/identity.events.js';
import { IdentityEventsTopic } from './events/identity.topics.js';
import {
  RefreshSessionRoute,
  RequestMfaChallengeRoute,
  SignInRoute,
  SignOutRoute,
  VerifyMfaRoute,
} from './http/auth.routes.js';
import {
  GetSessionAccessRoute,
  ListDevicesRoute,
  ListSessionsRoute,
  RevokeOtherSessionsRoute,
  RevokeSessionRoute,
} from './http/session.routes.js';
import {
  RequestStepUpChallengeRoute,
  StartStepUpRoute,
  VerifyStepUpRoute,
} from './http/step-up.routes.js';
import {
  GetUserAccessOperation,
  RevokeUserSessionsOperation,
} from './internal/identity.operations.js';
import {
  MfaChallengeRequestSchema,
  MfaChallengeSchema,
  MfaFactorSchema,
  MfaVerifyRequestSchema,
  PendingMfaSchema,
  SessionTokenRequestSchema,
  SessionTokensSchema,
  SignInRequestSchema,
  SignInResponseSchema,
  SignInStatusSchema,
  StepUpResultSchema,
  StepUpVerifyRequestSchema,
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
  SessionAccessSchema,
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
    'Identidad: inicio y cierre de sesión, refresh, MFA, paso adicional, sesiones, dispositivos y enums de acceso.',
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
    IdentityTopic,
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
    MfaChallengeRequest: MfaChallengeRequestSchema,
    MfaChallenge: MfaChallengeSchema,
    MfaVerifyRequest: MfaVerifyRequestSchema,
    SessionTokenRequest: SessionTokenRequestSchema,
    StepUpVerifyRequest: StepUpVerifyRequestSchema,
    StepUpResult: StepUpResultSchema,
    SessionSummary: SessionSummarySchema,
    SessionPage: SessionPageSchema,
    DeviceSummary: DeviceSummarySchema,
    DevicePage: DevicePageSchema,
    RevokeSessionRequest: RevokeSessionRequestSchema,
    RevokedSessions: RevokedSessionsSchema,
    RevokeUserSessionsInput: RevokeUserSessionsInputSchema,
    GetUserAccessInput: GetUserAccessInputSchema,
    UserAccess: UserAccessSchema,
    SessionAccess: SessionAccessSchema,
    SessionRevokedPayload: SessionRevokedPayloadSchema,
    TokensRevokedPayload: TokensRevokedPayloadSchema,
  },
  routes: {
    signIn: SignInRoute,
    requestMfaChallenge: RequestMfaChallengeRoute,
    verifyMfa: VerifyMfaRoute,
    refreshSession: RefreshSessionRoute,
    signOut: SignOutRoute,
    startStepUp: StartStepUpRoute,
    requestStepUpChallenge: RequestStepUpChallengeRoute,
    verifyStepUp: VerifyStepUpRoute,
    getSessionAccess: GetSessionAccessRoute,
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
  topics: { events: IdentityEventsTopic },
  errors: { IdentityErrorCode: identityErrorCatalog },
});
