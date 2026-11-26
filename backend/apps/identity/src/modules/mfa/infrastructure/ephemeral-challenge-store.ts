import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { MfaFactor } from '@contracts/identity';
import { Clock } from '@platform/kernel';
import { EphemeralStore } from '../../../ephemeral/ephemeral-store.js';
import { IdentityCacheKey } from '../../../shared/enums/identity-cache-key.enum.js';
import { ChallengeStore } from '../domain/challenge-store.js';
import type { MfaChallengeRecord } from '../domain/mfa-challenge.js';

const ChallengeSchema = z.object({
  id: z.string(),
  pendingId: z.string(),
  method: z.enum(MfaFactor),
  codeHash: z.string().optional(),
  expiresAt: z.coerce.date(),
});

/**
 * Challenges in Valkey. The attempt counter is an atomic `INCR` and single use is a `GETDEL` of the
 * challenge marker: both are server-side scripts, so two replicas do not race.
 */
@Injectable()
export class EphemeralChallengeStore extends ChallengeStore {
  constructor(
    private readonly store: EphemeralStore,
    private readonly clock: Clock,
  ) {
    super();
  }

  override async save(challenge: MfaChallengeRecord): Promise<void> {
    const ttl = this.ttlOf(challenge);
    await this.store.set(
      this.keyOf(challenge.id),
      JSON.stringify(challenge),
      ttl,
    );
    await this.store.set(this.liveKey(challenge.id), '1', ttl);
  }

  override async find(
    challengeId: string,
  ): Promise<MfaChallengeRecord | undefined> {
    const raw = await this.store.get(this.keyOf(challengeId));
    if (raw === undefined) {
      return undefined;
    }
    const parsed = ChallengeSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : undefined;
  }

  override async attempt(challengeId: string): Promise<number> {
    const ttl = (await this.store.remainingMs(this.keyOf(challengeId))) ?? 1;
    return this.store.increment(
      [IdentityCacheKey.MfaChallenge, challengeId, 'attempts'].join(':'),
      ttl,
    );
  }

  override async consume(challengeId: string): Promise<boolean> {
    return (await this.store.take(this.liveKey(challengeId))) !== undefined;
  }

  override countRequest(pendingId: string, windowMs: number): Promise<number> {
    return this.store.increment(
      [IdentityCacheKey.MfaChallengeRate, pendingId].join(':'),
      windowMs,
    );
  }

  private ttlOf(challenge: MfaChallengeRecord): number {
    return Math.max(
      1,
      challenge.expiresAt.getTime() - this.clock.now().getTime(),
    );
  }

  private keyOf(challengeId: string): string {
    return [IdentityCacheKey.MfaChallenge, challengeId].join(':');
  }

  private liveKey(challengeId: string): string {
    return [IdentityCacheKey.MfaChallenge, challengeId, 'live'].join(':');
  }
}
