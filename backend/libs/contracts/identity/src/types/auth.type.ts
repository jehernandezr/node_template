import type { PlatformRole } from '../enums/access.enum.js';
import type {
  AuthMethodReference,
  MfaFactor,
  SignInStatus,
  TokenAudience,
} from '../enums/auth.enum.js';
import type { DeviceSignatureFields } from './device.type.js';

/**
 * Email and password. `device` is the proof that the request comes from a registered device: its ES256
 * signature over `identity.auth.sign-in`, its public id, the timestamp, the nonce and the email.
 */
export interface SignInRequest {
  email: string;
  password: string;
  device?: DeviceSignatureFields;
}

/** Tokens issued by a completed sign-in or a refresh. */
export interface SessionTokens {
  /** Short-lived JWT; the client keeps it in memory only. */
  accessToken: string;
  /** ISO 8601 instant at which `accessToken` expires. */
  accessExpiresAt: string;
  /** Opaque session token. Absent on the web, where it lives in an httpOnly cookie. */
  sessionToken?: string;
}

/** Pending MFA challenge. */
export interface PendingMfa {
  /** Token that binds the challenge to the sign-in that asked for it. */
  mfaToken: string;
  methods: MfaFactor[];
}

/** Result of a sign-in or of an MFA verification. */
export interface SignInResponse {
  status: SignInStatus;
  /** Present when `status` is `authenticated`. */
  tokens?: SessionTokens;
  /** Present when `status` is `mfa_required`. */
  mfa?: PendingMfa;
  /** Region where the tenant data lives. Present with `authenticated`. */
  region?: string;
  /** Base URL of that region's API. Present with `authenticated`. */
  apiBaseUrl?: string;
}

/** Request for an MFA challenge with one of the offered methods. */
export interface MfaChallengeRequest {
  mfaToken: string;
  method: MfaFactor;
}

/** MFA challenge created. The code arrives through the chosen method. */
export interface MfaChallenge {
  /** Challenge id; it is sent when verifying. */
  challengeId: string;
  method: MfaFactor;
  /** ISO 8601 instant at which the code expires. */
  expiresAt: string;
  /** Digits of the code, when the method sends one (device or email). */
  codeLength?: number;
}

/** Verification of an MFA challenge. */
export interface MfaVerifyRequest {
  mfaToken: string;
  /** Challenge requested with `POST /v1/auth/mfa/challenges`. */
  challengeId: string;
  code: string;
  /** Device public key in base64url; only when registering a new one. */
  devicePublicKey?: string;
}

/**
 * Session token of a refresh or a sign-out. On the web it does not travel in
 * the body: the browser sends the `httpOnly` cookie and the server reads it.
 */
export interface SessionTokenRequest {
  sessionToken?: string;
}

/** Verification of the additional step (step-up) of an open session. */
export interface StepUpVerifyRequest {
  /** Step-up token, from `POST /v1/me/step-up`. */
  mfaToken: string;
  /** Challenge requested with `POST /v1/me/step-up/challenges`. */
  challengeId: string;
  code: string;
}

/** Result of a verified step-up. */
export interface StepUpResult {
  /** New access token, with the `auth_time` and `amr` of the second factor just verified. */
  tokens: SessionTokens;
  /** ISO 8601 instant of the second factor; it is the session's new `mfaVerifiedAt`. */
  mfaVerifiedAt: string;
}

/** Claims of the JWT access token (ADR 0022). Instants are epoch seconds. */
export interface AccessTokenClaims {
  /** Issuer of the region. */
  iss: string;
  aud: TokenAudience;
  /** User id. */
  sub: string;
  /** Active tenant. */
  tid: string;
  /** Home tenant of the user, which routes to their shard. */
  htid: string;
  /** Session. */
  sid: string;
  /** Device, if the session has one. */
  did?: string;
  amr: AuthMethodReference[];
  /** Last interactive authentication, step-up included. */
  auth_time: number;
  /** Roles of the user in the active tenant. */
  roles: string[];
  /** Platform roles. */
  proles: PlatformRole[];
  /** Permission version: `<tenant version>.<user version in the tenant>`. */
  pv: string;
  /** Residency region. */
  rgn: string;
  /** Absolute cap of the session. */
  sxp: number;
  iat: number;
  exp: number;
  jti: string;
}
