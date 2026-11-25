import { defineErrorCatalog, ErrorAudience } from '@contracts/platform';
import { IdentityErrorCode as C } from '../enums/identifiers.enum.js';

/** Catalog of the identity codes. */
export const identityErrorCatalog = defineErrorCatalog(C, {
  [C.AuthInvalidCredentials]: {
    httpStatus: 401,
    retryable: false,
    audience: ErrorAudience.Public,
    description:
      'The email or password is not valid, or the origin is blocked after failed attempts.',
  },
  [C.MfaTokenInvalid]: {
    httpStatus: 401,
    retryable: false,
    audience: ErrorAudience.Public,
    description: 'The MFA challenge does not exist or expired. Sign in again.',
  },
  [C.MfaCodeInvalid]: {
    httpStatus: 400,
    retryable: false,
    audience: ErrorAudience.Public,
    description: 'The verification code is not correct.',
  },
  [C.MfaCodeExpired]: {
    httpStatus: 400,
    retryable: false,
    audience: ErrorAudience.Public,
    description: 'The verification code expired. Request a new one.',
  },
  [C.MfaTooManyAttempts]: {
    httpStatus: 429,
    retryable: false,
    audience: ErrorAudience.Public,
    description: 'The challenge attempts ran out. Request a new one.',
  },
  [C.MfaStepUpRequired]: {
    httpStatus: 403,
    retryable: false,
    audience: ErrorAudience.Public,
    description: 'The operation requires verifying the second factor again.',
  },
  [C.MfaMethodUnavailable]: {
    httpStatus: 400,
    retryable: false,
    audience: ErrorAudience.Public,
    description:
      'The requested method is not among those offered by the MFA challenge. Choose another.',
  },
  [C.SessionRevoked]: {
    httpStatus: 401,
    retryable: false,
    audience: ErrorAudience.Public,
    description: 'The session was closed. Sign in again.',
  },
  [C.SessionExpired]: {
    httpStatus: 401,
    retryable: false,
    audience: ErrorAudience.Public,
    description:
      'The session expired due to inactivity or the absolute limit. Sign in again.',
  },
  [C.SessionReused]: {
    httpStatus: 401,
    retryable: false,
    audience: ErrorAudience.Public,
    description:
      'An already rotated session token was presented. The whole session was revoked. Sign in again.',
  },
  [C.TokenStalePermissions]: {
    httpStatus: 401,
    retryable: true,
    audience: ErrorAudience.Public,
    description:
      'Permissions changed since the token was issued. The client refreshes and retries.',
  },
  [C.TokenRevoked]: {
    httpStatus: 401,
    retryable: false,
    audience: ErrorAudience.Public,
    description:
      'The access token was revoked by the user or tenant epoch. Sign in again.',
  },
  [C.UserNotFound]: {
    httpStatus: 404,
    retryable: false,
    audience: ErrorAudience.Internal,
    description: 'The user does not exist.',
  },
  [C.UserSuspended]: {
    httpStatus: 403,
    retryable: false,
    audience: ErrorAudience.Public,
    description:
      'The user is suspended. Their sessions stay closed until reactivated.',
  },
  [C.TenantSuspended]: {
    httpStatus: 403,
    retryable: false,
    audience: ErrorAudience.Public,
    description:
      'The tenant is suspended. Sessions in it stay closed until reactivated.',
  },
  [C.AuthEmailNotVerified]: {
    httpStatus: 403,
    retryable: false,
    audience: ErrorAudience.Public,
    description:
      'The email is not verified yet. Confirm the link sent to your email.',
  },
  [C.UserEmailVerificationInvalid]: {
    httpStatus: 400,
    retryable: false,
    audience: ErrorAudience.Public,
    description:
      'The email verification link is not valid or expired. Request a new one.',
  },
  [C.PasswordPolicyViolation]: {
    httpStatus: 400,
    retryable: false,
    audience: ErrorAudience.Public,
    description:
      'The password does not meet the policy: 12 to 128 characters and different from the email.',
  },
  [C.PasswordBreached]: {
    httpStatus: 400,
    retryable: false,
    audience: ErrorAudience.Public,
    description: 'The password appears in known breaches. Choose another.',
  },
  [C.PasswordCurrentInvalid]: {
    httpStatus: 400,
    retryable: false,
    audience: ErrorAudience.Public,
    description: 'The current password is not correct.',
  },
  [C.PasswordResetInvalid]: {
    httpStatus: 400,
    retryable: false,
    audience: ErrorAudience.Public,
    description:
      'The password reset link is not valid or expired. Request a new one.',
  },
  [C.DeviceSignatureInvalid]: {
    httpStatus: 401,
    retryable: false,
    audience: ErrorAudience.Public,
    description: 'The device signature is not valid.',
  },
  [C.DeviceKeyInvalid]: {
    httpStatus: 400,
    retryable: false,
    audience: ErrorAudience.Public,
    description: 'The device public key is not valid.',
  },
  [C.MfaRecoveryNotReady]: {
    httpStatus: 403,
    retryable: false,
    audience: ErrorAudience.Public,
    description:
      'Second factor recovery is not available yet. Try again when the waiting period ends.',
  },
  [C.MfaFactorAlreadyEnrolled]: {
    httpStatus: 409,
    retryable: false,
    audience: ErrorAudience.Public,
    description: 'That second factor is already active.',
  },
  [C.MfaFactorNotEnrolled]: {
    httpStatus: 400,
    retryable: false,
    audience: ErrorAudience.Public,
    description: 'That second factor is not active.',
  },
  [C.PasskeyVerificationFailed]: {
    httpStatus: 400,
    retryable: false,
    audience: ErrorAudience.Public,
    description: 'The passkey could not be verified.',
  },
  [C.PasskeyChallengeExpired]: {
    httpStatus: 400,
    retryable: false,
    audience: ErrorAudience.Public,
    description: 'The passkey challenge expired. Try again.',
  },
  [C.TenantNotFound]: {
    httpStatus: 404,
    retryable: false,
    audience: ErrorAudience.Internal,
    description: 'The tenant does not exist.',
  },
  [C.TenantSlugTaken]: {
    httpStatus: 409,
    retryable: false,
    audience: ErrorAudience.Public,
    description: 'The tenant identifier is already in use. Choose another.',
  },
  [C.TenantNotMember]: {
    httpStatus: 403,
    retryable: false,
    audience: ErrorAudience.Public,
    description: 'You are not a member of that tenant.',
  },
  [C.TenantMoveNotMovable]: {
    httpStatus: 409,
    retryable: false,
    audience: ErrorAudience.Internal,
    description:
      'The shared customer tenant and the platform tenant spread their data across all shards and are not moved.',
  },
  [C.TenantMoveUnknownTarget]: {
    httpStatus: 400,
    retryable: false,
    audience: ErrorAudience.Internal,
    description:
      'The move target is not a configured shard group or is already the tenant location.',
  },
  [C.TenantMoveInProgress]: {
    httpStatus: 409,
    retryable: false,
    audience: ErrorAudience.Internal,
    description: 'The tenant already has a move in progress.',
  },
  [C.AccessLastOwner]: {
    httpStatus: 409,
    retryable: false,
    audience: ErrorAudience.Public,
    description: 'The tenant must keep at least one owner.',
  },
  [C.AccessSystemRoleImmutable]: {
    httpStatus: 409,
    retryable: false,
    audience: ErrorAudience.Public,
    description: 'System roles cannot be modified or deleted.',
  },
  [C.AccessNameTaken]: {
    httpStatus: 409,
    retryable: false,
    audience: ErrorAudience.Public,
    description: 'A group or role with that name already exists.',
  },
  [C.InvitationInvalid]: {
    httpStatus: 400,
    retryable: false,
    audience: ErrorAudience.Public,
    description: 'The invitation is not valid, expired or was already used.',
  },
  [C.InvitationEmailMismatch]: {
    httpStatus: 403,
    retryable: false,
    audience: ErrorAudience.Public,
    description:
      'The verified email of your account does not match the invitation email.',
  },
  [C.ApiKeyInvalid]: {
    httpStatus: 401,
    retryable: false,
    audience: ErrorAudience.Public,
    description: 'The API key is not valid.',
  },
  [C.ApiKeyExpired]: {
    httpStatus: 401,
    retryable: false,
    audience: ErrorAudience.Public,
    description: 'The API key expired.',
  },
  [C.ApiKeyIpNotAllowed]: {
    httpStatus: 403,
    retryable: false,
    audience: ErrorAudience.Public,
    description: 'The API key cannot be used from this IP address.',
  },
  [C.ApiKeyPermissionNotGrantable]: {
    httpStatus: 403,
    retryable: false,
    audience: ErrorAudience.Public,
    description: 'You cannot grant permissions your account does not have.',
  },
  [C.ServiceAccountDisabled]: {
    httpStatus: 403,
    retryable: false,
    audience: ErrorAudience.Public,
    description: 'The service account is disabled.',
  },
});
