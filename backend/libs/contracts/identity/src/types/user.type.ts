import type { UserStatus } from '../enums/user.enum.js';

/** Creation of a user. The language travels as a BCP 47 tag. */
export interface SignUpRequest {
  email: string;
  password: string;
  displayName: string;
  locale: string;
  /** Token of the invitation the user accepts when signing up. */
  invitationToken?: string;
}

/** Request for a new verification email. */
export interface EmailVerificationRequest {
  email: string;
}

/** Confirmation of the verification with the token that arrived by email. */
export interface EmailVerificationConfirmRequest {
  token: string;
}

/** Profile of the authenticated user. */
export interface UserProfile {
  id: string;
  email: string;
  /** ISO 8601 instant of the verification, or null while not verified. */
  emailVerifiedAt: string | null;
  displayName: string;
  locale: string;
  status: UserStatus;
  homeTenantId: string;
  /** Last tenant where the user opened a session, or null if never. */
  lastTenantId: string | null;
}

/** Partial changes to the profile. Absent fields do not change. */
export interface UpdateProfileRequest {
  displayName?: string;
  locale?: string;
}

/** Request to change the email to a new address. */
export interface EmailChangeRequest {
  newEmail: string;
}

/** Confirmation of the email change with the token sent to the new address. */
export interface EmailChangeConfirmRequest {
  token: string;
}

/** Input of the internal operation that suspends a user. */
export interface SuspendUserInput {
  userId: string;
  reason?: string;
}

/** Input of the internal operation that reactivates a user. */
export interface ReactivateUserInput {
  userId: string;
}

/** Result of suspending or reactivating a user. */
export interface UserOperationResult {
  userId: string;
  status: UserStatus;
}

/** Input of the internal operation that reads a user's profile. */
export interface GetUserProfileInput {
  userId: string;
}

/** Payload of `identity.user.registered.v1`. */
export interface UserRegisteredPayload {
  userId: string;
  homeTenantId: string;
  registeredAt: string;
}

/** Payload of `identity.user.suspended.v1`. */
export interface UserSuspendedPayload {
  userId: string;
  reason?: string;
  suspendedAt: string;
}

/** Payload of `identity.user.reactivated.v1`. */
export interface UserReactivatedPayload {
  userId: string;
  reactivatedAt: string;
}

/** Payload of `identity.user.email-changed.v1`. */
export interface UserEmailChangedPayload {
  userId: string;
  changedAt: string;
}
