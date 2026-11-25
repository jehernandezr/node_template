/** TOTP enrollment: the secret and the URI the authenticator app scans. */
export interface TotpEnrollment {
  /** Secret in base32. The client shows it only once. */
  secret: string;
  otpauthUri: string;
}

/** TOTP confirmation with the first code the app generates. */
export interface TotpConfirmRequest {
  code: string;
}

/** Recovery codes in plain text. They are shown only once. */
export interface RecoveryCodes {
  codes: string[];
}

/** Recovery request for an account without access to its factors. */
export interface MfaRecoveryStartRequest {
  mfaToken: string;
}

/** Recovery started: the user can confirm it from that date. */
export interface MfaRecoveryStarted {
  /** ISO 8601 instant from which the recovery can be confirmed. */
  availableAt: string;
}

/** Confirmation of the recovery with the token sent by email. */
export interface MfaRecoveryConfirmRequest {
  mfaToken: string;
  token: string;
  /** Public key of the device in base64url, to register a new one. */
  devicePublicKey?: string;
}
