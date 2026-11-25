const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/** Defaults and caps of identity. Those the configuration can change are named `default...`. */
export const IdentityDefaults = {
  defaultAccessTokenTtlMs: 10 * MINUTE_MS,
  defaultSessionIdleTtlMs: DAY_MS,
  defaultSessionAbsoluteTtlMs: 30 * DAY_MS,
  /** Grace in which the session token of the previous generation does not revoke the session (two tabs refreshing at once). */
  refreshGraceMs: 5_000,
  /** How much `idleExpiresAt` is extended on each refresh. */
  refreshExtensionMs: DAY_MS,
  emailVerificationTtlMs: DAY_MS,
  passwordResetTtlMs: 30 * MINUTE_MS,
  pendingAuthenticationTtlMs: 10 * MINUTE_MS,
  deviceNonceTtlMs: 5 * MINUTE_MS,
  webAuthnChallengeTtlMs: 5 * MINUTE_MS,
  invitationTtlMs: 7 * DAY_MS,
  /** A reservation of `identity_lookup` without a user is swept after an hour. */
  reservedLookupMaxAgeMs: HOUR_MS,
  passwordMinLength: 12,
  passwordMaxLength: 128,
  defaultMfaRecoveryBaseHours: 24,
  /** Window in which recoveries are counted to double the wait. */
  mfaRecoveryWindowDays: 90,
  /** Doublings of the recovery wait at most: 24 h, 48 h and 96 h with the default base. */
  mfaRecoveryMaxDoublings: 2,
  /** A recovery not confirmed within this time after it becomes available expires. */
  mfaRecoveryConfirmWindowMs: 3 * DAY_MS,
  defaultApiKeyRotationGraceHours: 24,
  apiKeyPrefixLength: 12,
  apiKeySecretBytes: 32,
  /** Months of retention of `login_attempts`. */
  loginAttemptRetentionMonths: 12,
  /** A device signature with more skew than this is rejected. */
  deviceSignatureSkewMs: MINUTE_MS,
  /** Bytes of the secret of an opaque token. */
  opaqueSecretBytes: 32,
} as const;
