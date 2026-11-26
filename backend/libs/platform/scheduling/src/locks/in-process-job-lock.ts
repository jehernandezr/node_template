import { Clock, JobLock, RandomSource, type JobLease } from '@platform/kernel';

interface StoredLease {
  readonly token: string;
  readonly expiresAt: number;
}

/**
 * In-memory lock: mutual exclusion between the runners of the same process. Useful for
 * local mode and tests; across processes `ValkeyJobLock` is needed.
 */
export class InProcessJobLock extends JobLock {
  private readonly leases = new Map<string, StoredLease>();
  private sequence = 0;

  constructor(
    private readonly clock: Clock,
    private readonly random: RandomSource,
  ) {
    super();
  }

  /**
   * The counter prevents two leases with the same bytes from sharing a token.
   */
  async tryAcquire(name: string, ttlMs: number): Promise<JobLease | undefined> {
    const current = this.leases.get(name);
    const now = this.clock.now().getTime();
    if (current !== undefined && current.expiresAt > now) {
      return undefined;
    }
    this.sequence += 1;
    const random = Buffer.from(this.random.bytes(8)).toString('hex');
    const token = `${random}-${this.sequence}`;
    this.leases.set(name, { token, expiresAt: now + ttlMs });
    return { name, token };
  }

  /**
   * Only the current owner releases: an expired lease does not remove the lock from whoever took it later.
   */
  async release(lease: JobLease): Promise<void> {
    if (this.leases.get(lease.name)?.token === lease.token) {
      this.leases.delete(lease.name);
    }
  }
}
