/** Resultado de un intento de inicio de sesión. */
export enum LoginAttemptResult {
  Succeeded = 'succeeded',
  Failed = 'failed',
}

/** Por qué falló un intento. */
export enum LoginAttemptReason {
  InvalidPassword = 'invalid_password',
  Locked = 'locked',
  Suspended = 'suspended',
  EmailNotVerified = 'email_not_verified',
}

/** Un intento de inicio de sesión de una cuenta existente. Solo se inserta. */
export interface LoginAttempt {
  readonly id: string;
  readonly userId: string;
  readonly result: LoginAttemptResult;
  readonly reason?: LoginAttemptReason;
  readonly ip: string;
  readonly deviceId?: string;
  readonly traceId?: string;
  readonly attemptedAt: Date;
}
