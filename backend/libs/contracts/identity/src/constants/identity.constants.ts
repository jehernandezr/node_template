/** Límites de los campos de identidad. Todo texto del contrato se acota con uno de estos valores. */
export const IdentityLimits = {
  emailMaxLength: 254,
  passwordMaxLength: 128,
  deviceIdMaxLength: 512,
  deviceNameMaxLength: 120,
  devicePublicKeyMaxLength: 2048,
  mfaTokenMaxLength: 2048,
  mfaCodeMinLength: 6,
  mfaCodeMaxLength: 64,
  tokenMaxLength: 8192,
  roleNameMaxLength: 80,
  maxRolesPerUser: 50,
  permissionVersionMaxLength: 32,
  displayNameMaxLength: 120,
  localeMinLength: 2,
  localeMaxLength: 35,
  /** Tokens de un solo uso: verificación de email, reset de contraseña e invitaciones. */
  actionTokenMaxLength: 512,
  reasonMaxLength: 200,
  groupNameMaxLength: 80,
  maxGroupsPerMember: 50,
  maxPermissionsPerRole: 100,
  passkeyNameMaxLength: 120,
  passkeyOptionsMaxLength: 8192,
  passkeyCredentialMaxLength: 16384,
  totpSecretMaxLength: 128,
  otpauthUriMaxLength: 512,
  totpCodeMinLength: 6,
  totpCodeMaxLength: 8,
  recoveryCodesMax: 20,
  recoveryCodeMinLength: 8,
  recoveryCodeMaxLength: 64,
  devicePushTokenMaxLength: 512,
  deviceNonceMinLength: 16,
  deviceNonceMaxLength: 128,
  deviceSignatureMaxLength: 256,
  maxDeviceApprovals: 20,
  approvalCodeMinLength: 6,
  approvalCodeMaxLength: 64,
  approvalContextMaxLength: 120,
  tenantSlugMinLength: 3,
  tenantSlugMaxLength: 63,
  tenantNameMaxLength: 120,
  regionMaxLength: 32,
  /** URL base de la API regional que devuelve el inicio de sesión. */
  apiBaseUrlMaxLength: 2048,
  /** Dispositivos con push que se devuelven por usuario. */
  maxPushTargets: 50,
  serviceAccountNameMaxLength: 120,
  apiKeyPrefixLength: 12,
  apiKeySecretMaxLength: 128,
  apiKeyInputMaxLength: 256,
  apiKeyCidrMaxLength: 64,
  maxApiKeyCidrs: 20,
  pinnedApiVersionMaxLength: 16,
  clientIpMaxLength: 64,
  jwkFieldMaxLength: 256,
  maxJwks: 10,
} as const;

/** Reglas del segundo factor. */
export const MfaRules = {
  /** Dígitos del código que genera un dispositivo registrado. */
  deviceCodeLength: 8,
  /** Dígitos del código enviado por email al primer dispositivo. */
  emailCodeLength: 6,
  maxAttemptsPerChallenge: 5,
  /** Desafíos que se pueden pedir por cada ventana de `challengeWindowMinutes`. */
  maxChallengesPerWindow: 3,
  challengeWindowMinutes: 15,
  /** Vida del código que muestra el dispositivo registrado. */
  deviceCodeTtlSeconds: 180,
  /** Vida del código enviado por email. */
  emailCodeTtlSeconds: 300,
  /** Edad máxima del último MFA para operaciones sensibles (step-up). */
  stepUpMaxAgeMinutes: 10,
} as const;

/** Vida de un access token. El emisor elige un valor dentro de este rango y el verificador rechaza los que quedan fuera. */
export const AccessTokenRules = {
  minLifetimeSeconds: 600,
  maxLifetimeSeconds: 900,
} as const;
