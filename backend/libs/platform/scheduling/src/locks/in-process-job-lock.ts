import {
  Clock,
  JobLock,
  RandomSource,
  SystemClock,
  SystemRandomSource,
  type JobLease,
} from '@platform/kernel';

interface StoredLease {
  readonly token: string;
  readonly expiresAt: number;
}

/**
 * Lock en memoria: exclusión entre los runners de un mismo proceso. Sirve para
 * el modo local y las pruebas; entre procesos hace falta `ValkeyJobLock`.
 */
export class InProcessJobLock extends JobLock {
  private readonly leases = new Map<string, StoredLease>();
  private sequence = 0;

  constructor(
    private readonly clock: Clock = new SystemClock(),
    private readonly random: RandomSource = new SystemRandomSource(),
  ) {
    super();
  }

  async tryAcquire(name: string, ttlMs: number): Promise<JobLease | undefined> {
    const current = this.leases.get(name);
    const now = this.clock.now().getTime();
    if (current !== undefined && current.expiresAt > now) {
      return undefined;
    }
    // El contador evita que dos leases con los mismos bytes compartan token.
    this.sequence += 1;
    const random = Buffer.from(this.random.bytes(8)).toString('hex');
    const token = `${random}-${this.sequence}`;
    this.leases.set(name, { token, expiresAt: now + ttlMs });
    return { name, token };
  }

  async release(lease: JobLease): Promise<void> {
    // Solo el dueño actual libera: un lease vencido no quita el lock de quien lo tomó después.
    if (this.leases.get(lease.name)?.token === lease.token) {
      this.leases.delete(lease.name);
    }
  }
}
