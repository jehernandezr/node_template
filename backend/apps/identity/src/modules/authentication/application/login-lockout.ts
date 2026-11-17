import { Injectable } from '@nestjs/common';
import { LockoutRules } from '../../../shared/constants/lockout.constants.js';
import { AttemptCounters } from '../domain/attempt-counters.js';
import type { FailureOutcome } from '../domain/failure-outcome.js';
import { LockoutPolicy } from '../domain/lockout-policy.js';
import { LockoutStore } from '../domain/lockout-store.js';
import { LockoutKeys } from './lockout-keys.js';

/**
 * Bloqueo por intentos fallidos de una cuenta (o de una API key, que cuenta como una) desde una IP: cuenta
 * los fallos con `AttemptCounters`, decide con `LockoutPolicy` y guarda el bloqueo en `LockoutStore`. El
 * origen lleva la época de desbloqueo de la cuenta, así que desbloquearla deja atrás todos sus orígenes.
 */
@Injectable()
export class LoginLockout {
  private readonly policy = new LockoutPolicy();

  constructor(
    private readonly counters: AttemptCounters,
    private readonly store: LockoutStore,
    private readonly keys: LockoutKeys,
  ) {}

  /** Milisegundos que faltan del bloqueo de la cuenta desde esa IP o de la IP; `undefined` sin bloqueo. */
  async remainingLockMs(
    account: string,
    ip: string,
  ): Promise<number | undefined> {
    return this.store.remainingLockMs(await this.originOf(account, ip), ip);
  }

  isProtected(account: string): Promise<boolean> {
    return this.store.isProtected(account);
  }

  /** Cuenta el fallo y activa los bloqueos que correspondan. */
  async recordFailure(account: string, ip: string): Promise<FailureOutcome> {
    const origin = await this.originOf(account, ip);
    const counts = await this.counters.recordFailure(origin, account, ip);
    // Solo quien activa el modo protegido lo informa: los fallos siguientes ya lo encuentran activo.
    const protectedModeEnabled =
      this.policy.enablesProtectedMode(counts.account) &&
      (await this.store.protect(account, LockoutRules.origin.maxLockMs));
    if (this.policy.locksIp(counts.ip)) {
      await this.store.lockIp(ip, LockoutRules.ip.lockMs);
    }
    if (!this.policy.locksOrigin(counts.origin)) {
      return { protectedModeEnabled };
    }
    const level = await this.store.raiseLevel(
      origin,
      LockoutRules.origin.maxLockMs,
    );
    const lockedForMs = this.policy.originLockMs(level);
    await this.store.lockOrigin(origin, lockedForMs);
    await this.counters.clearOrigin(origin);
    return { lockedForMs, protectedModeEnabled };
  }

  /** Un inicio de sesión correcto olvida los fallos de su origen. */
  async clear(account: string, ip: string): Promise<void> {
    await this.counters.clearOrigin(await this.originOf(account, ip));
  }

  /** Quita los bloqueos de todos los orígenes de la cuenta, su modo protegido y sus fallos. */
  async unlock(account: string): Promise<void> {
    await this.store.unlock(account, LockoutRules.origin.maxLockMs);
    await this.counters.clearAccount(account);
  }

  private async originOf(account: string, ip: string): Promise<string> {
    const epoch = await this.store.unlockEpoch(account);
    return this.keys.origin(`${account}:${epoch}`, ip);
  }
}
