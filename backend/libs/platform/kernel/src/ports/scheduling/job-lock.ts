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
   * Extends a lease that is still held by `ttlMs` from now, so a run that lasts longer than the first
   * `ttlMs` keeps the job to itself.
   * @param lease Lease to extend.
   * @param ttlMs New lease duration, counted from now.
   * @returns `true` if the lease was still held and now lasts `ttlMs` more; `false` if it expired or another
   * process took the job.
   */
  abstract renew(lease: JobLease, ttlMs: number): Promise<boolean>;

  /**
   * Releases a lease that is still held.
   * @param lease Lease to release.
   */
  abstract release(lease: JobLease): Promise<void>;
}
