/** Límites de los campos de identidad. */
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
