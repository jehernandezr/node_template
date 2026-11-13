/** Códigos de error del servicio identity. */
export enum IdentityErrorCode {
  AuthInvalidCredentials = 'IDENTITY.AUTH.INVALID_CREDENTIALS',
  MfaTokenInvalid = 'IDENTITY.MFA.TOKEN_INVALID',
  MfaCodeInvalid = 'IDENTITY.MFA.CODE_INVALID',
  MfaCodeExpired = 'IDENTITY.MFA.CODE_EXPIRED',
  MfaTooManyAttempts = 'IDENTITY.MFA.TOO_MANY_ATTEMPTS',
  MfaStepUpRequired = 'IDENTITY.MFA.STEP_UP_REQUIRED',
  SessionRevoked = 'IDENTITY.SESSION.REVOKED',
  TokenStalePermissions = 'IDENTITY.TOKEN.STALE_PERMISSIONS',
  UserNotFound = 'IDENTITY.USER.NOT_FOUND',
}

/** Identificadores de las rutas públicas de identity. */
export enum IdentityRoute {
  SignIn = 'identity.auth.sign-in',
  RequestMfaChallenge = 'identity.auth.mfa-challenge',
  VerifyMfa = 'identity.auth.mfa-verify',
  GetSessionAccess = 'identity.me.access',
  ListSessions = 'identity.sessions.list',
  RevokeSession = 'identity.sessions.revoke',
  RevokeOtherSessions = 'identity.sessions.revoke-others',
  ListDevices = 'identity.devices.list',
}

/** Identificadores de las operaciones internas de identity. */
export enum IdentityOperation {
  RevokeUserSessions = 'identity.sessions.revoke-for-user.v1',
  GetUserAccess = 'identity.users.get-access.v1',
}

/** Tipos CloudEvents de los eventos que publica identity. */
export enum IdentityEvent {
  SessionRevoked = 'identity.session.revoked.v1',
  TokensRevoked = 'identity.tokens.revoked.v1',
}

/** Tópicos donde identity publica sus eventos. */
export enum IdentityTopic {
  Events = 'identity-events',
}
