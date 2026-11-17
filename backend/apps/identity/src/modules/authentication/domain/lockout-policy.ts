import { LockoutRules } from '../../../shared/constants/lockout.constants.js';

/**
 * Reglas de bloqueo por intentos fallidos: espera exponencial por origen (cuenta e IP), modo protegido por
 * cuenta y bloqueo de la IP. Es cálculo puro sobre los contadores.
 */
export class LockoutPolicy {
  /** El bloqueo número `level` (desde 1) dura 15, 30, 60 minutos... hasta 24 horas. */
  originLockMs(level: number): number {
    return Math.min(
      LockoutRules.origin.baseLockMs * 2 ** Math.max(0, level - 1),
      LockoutRules.origin.maxLockMs,
    );
  }

  locksOrigin(failures: number): boolean {
    return failures >= LockoutRules.origin.maxFailures;
  }

  /** Desde el umbral la cuenta pasa a modo protegido; el almacén avisa solo la primera vez. */
  enablesProtectedMode(failures: number): boolean {
    return failures >= LockoutRules.protectedMode.maxFailures;
  }

  locksIp(failures: number): boolean {
    return failures >= LockoutRules.ip.maxFailures;
  }
}
