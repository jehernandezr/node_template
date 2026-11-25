/** Result of a sign-in attempt. */
export enum LoginAttemptResult {
  Succeeded = 'succeeded',
  Failed = 'failed',
}

/** Why an attempt failed. */
export enum LoginAttemptReason {
  InvalidPassword = 'invalid_password',
  Locked = 'locked',
  Suspended = 'suspended',
  EmailNotVerified = 'email_not_verified',
  UnknownAccount = 'unknown_account',
}

/**
 * A sign-in attempt. An attempt on an email without an account has no user and is recorded all the same, so
 * a failure costs the same whether or not the account exists. It is only inserted.
 */
export interface LoginAttempt {
  readonly id: string;
  readonly userId: string | null;
  readonly result: LoginAttemptResult;
  readonly reason?: LoginAttemptReason;
  readonly ip: string;
  readonly deviceId?: string;
  readonly traceId?: string;
  readonly attemptedAt: Date;
}
