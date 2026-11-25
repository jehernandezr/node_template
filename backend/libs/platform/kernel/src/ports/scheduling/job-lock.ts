import type { JobLease } from './job-lease.js';

/** Mutual exclusion between processes for `exclusive` jobs. */
export abstract class JobLock {
  /** Takes the lock for `ttlMs`, or returns `undefined` if another process holds it. */
  abstract tryAcquire(
    name: string,
    ttlMs: number,
  ): Promise<JobLease | undefined>;

  abstract release(lease: JobLease): Promise<void>;
}
