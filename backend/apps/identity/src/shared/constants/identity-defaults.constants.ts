const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/** Valores por defecto y topes de identity. Los que la configuración puede cambiar se llaman `default...`. */
export const IdentityDefaults = {
  defaultAccessTokenTtlMs: 10 * MINUTE_MS,
  defaultSessionIdleTtlMs: DAY_MS,
  defaultSessionAbsoluteTtlMs: 30 * DAY_MS,
  /** Gracia en que el session token de la generación anterior no revoca la sesión (dos pestañas que refrescan a la vez). */
  refreshGraceMs: 5_000,
  /** Cuánto se extiende `idleExpiresAt` en cada refresh. */
  refreshExtensionMs: DAY_MS,
  emailVerificationTtlMs: DAY_MS,
  passwordResetTtlMs: 30 * MINUTE_MS,
  pendingAuthenticationTtlMs: 10 * MINUTE_MS,
  deviceNonceTtlMs: 5 * MINUTE_MS,
  webAuthnChallengeTtlMs: 5 * MINUTE_MS,
  invitationTtlMs: 7 * DAY_MS,
  /** Una reserva de `identity_lookup` sin usuario se barre a la hora. */
  reservedLookupMaxAgeMs: HOUR_MS,
  passwordMinLength: 12,
  passwordMaxLength: 128,
  defaultMfaRecoveryBaseHours: 24,
  /** Ventana en que se cuentan las recuperaciones para duplicar la espera. */
  mfaRecoveryWindowDays: 90,
  defaultApiKeyRotationGraceHours: 24,
  apiKeyPrefixLength: 12,
  apiKeySecretBytes: 32,
  /** Meses de retención de `login_attempts`. */
  loginAttemptRetentionMonths: 12,
  /** Un `deviceId` o una firma de dispositivo con más de este desfase se rechaza. */
  deviceSignatureSkewMs: MINUTE_MS,
  /** Bytes del secreto de un token opaco. */
  opaqueSecretBytes: 32,
} as const;
