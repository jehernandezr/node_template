/** Lo que dejó una pasada de mantenimiento de `login_attempts`. */
export interface LoginAttemptRetentionReport {
  /** Particiones borradas por shard. */
  readonly dropped: readonly string[];
  /** Shards que fallaron: la próxima pasada los vuelve a intentar. */
  readonly failedShards: readonly string[];
}

/** Retención de 12 meses de la bitácora de intentos de inicio de sesión, en todos los shards. */
export abstract class LoginAttemptRetention {
  abstract maintain(now: Date): Promise<LoginAttemptRetentionReport>;
}
