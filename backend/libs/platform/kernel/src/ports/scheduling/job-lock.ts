import type { JobLease } from './job-lease.js';

/** Exclusión mutua entre procesos para los jobs `exclusive`. */
export abstract class JobLock {
  /** Toma el lock por `ttlMs`, o devuelve `undefined` si otro proceso lo tiene. */
  abstract tryAcquire(
    name: string,
    ttlMs: number,
  ): Promise<JobLease | undefined>;

  abstract release(lease: JobLease): Promise<void>;
}
