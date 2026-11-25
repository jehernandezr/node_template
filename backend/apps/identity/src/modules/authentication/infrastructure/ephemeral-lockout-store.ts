import { Injectable } from '@nestjs/common';
import { EphemeralStore } from '../../../ephemeral/ephemeral-store.js';
import { IdentityCacheKey } from '../../../shared/enums/identity-cache-key.enum.js';
import { LockoutStore } from '../domain/lockout-store.js';

/** Lockouts in Valkey with atomic increments and self-expiring keys. */
@Injectable()
export class EphemeralLockoutStore extends LockoutStore {
  private static readonly MARK = '1';

  constructor(private readonly store: EphemeralStore) {
    super();
  }

  async remainingLockMs(
    origin: string,
    ip: string,
  ): Promise<number | undefined> {
    const remaining = [
      await this.store.remainingMs(
        this.key(IdentityCacheKey.LockoutOrigin, origin),
      ),
      await this.store.remainingMs(this.key(IdentityCacheKey.LockoutIp, ip)),
    ].filter((value): value is number => value !== undefined);
    return remaining.length === 0 ? undefined : Math.max(...remaining);
  }

  async isProtected(account: string): Promise<boolean> {
    return (
      (await this.store.get(
        this.key(IdentityCacheKey.LockoutProtected, account),
      )) !== undefined
    );
  }

  raiseLevel(origin: string, ttlMs: number): Promise<number> {
    return this.store.increment(
      this.key(IdentityCacheKey.LockoutLevel, origin),
      ttlMs,
    );
  }

  lockOrigin(origin: string, lockMs: number): Promise<void> {
    return this.store.set(
      this.key(IdentityCacheKey.LockoutOrigin, origin),
      EphemeralLockoutStore.MARK,
      lockMs,
    );
  }

  lockIp(ip: string, lockMs: number): Promise<void> {
    return this.store.set(
      this.key(IdentityCacheKey.LockoutIp, ip),
      EphemeralLockoutStore.MARK,
      lockMs,
    );
  }

  protect(account: string, ttlMs: number): Promise<boolean> {
    return this.store.setIfAbsent(
      this.key(IdentityCacheKey.LockoutProtected, account),
      EphemeralLockoutStore.MARK,
      ttlMs,
    );
  }

  async unlockEpoch(account: string): Promise<number> {
    const raw = await this.store.get(
      this.key(IdentityCacheKey.LockoutEpoch, account),
    );
    return raw === undefined ? 0 : Number(raw);
  }

  async unlock(account: string, ttlMs: number): Promise<void> {
    const epoch = this.key(IdentityCacheKey.LockoutEpoch, account);
    await this.store.increment(epoch, ttlMs);
    await this.store.extend(epoch, ttlMs);
    await this.store.delete(
      this.key(IdentityCacheKey.LockoutProtected, account),
    );
  }

  async retainEpoch(account: string, ttlMs: number): Promise<void> {
    await this.store.extend(
      this.key(IdentityCacheKey.LockoutEpoch, account),
      ttlMs,
    );
  }

  private key(...parts: string[]): string {
    return parts.join(':');
  }
}
