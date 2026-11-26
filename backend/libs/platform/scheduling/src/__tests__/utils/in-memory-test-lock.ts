import { JobLock, type JobLease } from '@platform/kernel';

/** Controllable lock to test `JobExecution` without a clock or timings. */
export class InMemoryTestLock extends JobLock {
  held = false;
  failRelease = false;
  releases = 0;
  renewals = 0;
  leaseLost = false;

  override async tryAcquire(name: string): Promise<JobLease | undefined> {
    if (this.held) {
      return undefined;
    }
    this.held = true;
    return { name, token: 'test-token' };
  }

  override async renew(): Promise<boolean> {
    this.renewals += 1;
    return !this.leaseLost;
  }

  override async release(): Promise<void> {
    this.releases += 1;
    if (this.failRelease) {
      throw new Error('release failed');
    }
    this.held = false;
  }
}
