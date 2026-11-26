import { createHash } from 'node:crypto';

/**
 * Assigns a user to a bucket from 0 to 99 per flag. The hash of `flag:user` is stable across processes and
 * deployments, so raising the percentage only adds users: nobody who already had it loses it.
 */
export class RolloutBucket {
  private static readonly BUCKETS = 100;

  /**
   * Places a user in a stable bucket from 0 to 99 for a flag's percentage rollout.
   * @param flag Flag name.
   * @param userId User id.
   * @returns The bucket.
   */
  static of(flag: string, userId: string): number {
    const digest = createHash('sha256').update(`${flag}:${userId}`).digest();
    return digest.readUInt32BE(0) % RolloutBucket.BUCKETS;
  }
}
