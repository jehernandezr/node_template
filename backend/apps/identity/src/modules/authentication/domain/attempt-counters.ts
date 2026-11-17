/** Fallos recientes que dejó un intento, cada uno contado en su propia ventana. */
export interface AttemptCounts {
  readonly origin: number;
  readonly account: number;
  readonly ip: number;
}

/**
 * Cuenta los fallos de inicio de sesión por origen (cuenta más IP), por cuenta y por IP, cada uno en su
 * ventana deslizante. Solo cuenta: decidir un bloqueo es de `LockoutPolicy`.
 */
export abstract class AttemptCounters {
  abstract recordFailure(
    origin: string,
    account: string,
    ip: string,
  ): Promise<AttemptCounts>;

  /** Olvida los fallos del origen: un inicio de sesión correcto o un bloqueo recién activado. */
  abstract clearOrigin(origin: string): Promise<void>;

  /** Olvida los fallos de la cuenta desde cualquier origen. */
  abstract clearAccount(account: string): Promise<void>;
}
