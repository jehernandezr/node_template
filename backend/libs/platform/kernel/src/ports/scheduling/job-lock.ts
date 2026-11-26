import type { JobLease } from './job-lease.js';

/** Mutual exclusion between processes for `exclusive` jobs. */
export abstract class JobLock {
  /**
   * Takes the lock for `ttlMs`, or returns `undefined` if another process holds it.
   * @param name Job name.
   * @param ttlMs Lease duration.
   * @returns The lease, or `undefined`.
   */
  abstract tryAcquire(
    name: string,
    ttlMs: number,
  ): Promise<JobLease | undefined>;

  /**
   * Releases a lease that is still held.
   * @param lease Lease to release.
   */
  abstract release(lease: JobLease): Promise<void>;
}
