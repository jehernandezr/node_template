const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;

/**
 * Reglas de bloqueo por intentos fallidos: bloqueo exponencial por origen (cuenta e IP o dispositivo),
 * modo protegido por cuenta y bloqueo de IP.
 */
export const LockoutRules = {
  origin: {
    /** Fallos de una cuenta desde un origen que activan el bloqueo. */
    maxFailures: 5,
    windowMs: 15 * MINUTE_MS,
    /** Primera espera; cada bloqueo nuevo la duplica (15, 30, 60 min). */
    baseLockMs: 15 * MINUTE_MS,
    /** Tope de la espera: 24 h. */
    maxLockMs: 24 * HOUR_MS,
  },
  /**
   * Vida de la época de desbloqueo desde el último bloqueo escrito con ella. Si venciera antes que un
   * bloqueo, la cuenta volvería a la época 0 y ese bloqueo dejaría de verse; por eso dobla el tope.
   */
  unlockEpochTtlMs: 48 * HOUR_MS,
  protectedMode: {
    /** Fallos de una cuenta desde varios orígenes que activan el modo protegido. */
    maxFailures: 20,
    windowMs: HOUR_MS,
  },
  ip: {
    /** Fallos de una IP sobre cualquier cuenta que bloquean la IP. */
    maxFailures: 50,
    windowMs: 15 * MINUTE_MS,
    lockMs: 15 * MINUTE_MS,
  },
} as const;
