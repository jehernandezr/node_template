/** Alta del TOTP: el secreto y la URI que la app autenticadora escanea. */
export interface TotpEnrollment {
  /** Secreto en base32. El cliente lo muestra una sola vez. */
  secret: string;
  otpauthUri: string;
}

/** Confirmación del TOTP con el primer código que genera la app. */
export interface TotpConfirmRequest {
  code: string;
}

/** Códigos de recuperación en claro. Se muestran una sola vez. */
export interface RecoveryCodes {
  codes: string[];
}

/** Pedido de recuperación de una cuenta sin acceso a sus factores. */
export interface MfaRecoveryStartRequest {
  mfaToken: string;
}

/** Recuperación iniciada: el usuario puede confirmarla desde esa fecha. */
export interface MfaRecoveryStarted {
  /** Instante ISO 8601 desde el que se puede confirmar la recuperación. */
  availableAt: string;
}

/** Confirmación de la recuperación con el token enviado por email. */
export interface MfaRecoveryConfirmRequest {
  mfaToken: string;
  token: string;
  /** Clave pública del dispositivo en base64url, para registrar uno nuevo. */
  devicePublicKey?: string;
}
