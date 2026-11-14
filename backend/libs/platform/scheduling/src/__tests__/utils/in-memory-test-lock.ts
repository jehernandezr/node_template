import { JobLock, type JobLease } from '@platform/kernel';

/** Lock controlable para probar `JobExecution` sin reloj ni tiempos. */
export class InMemoryTestLock extends JobLock {
  held = false;
  failRelease = false;
  releases = 0;

  async tryAcquire(name: string): Promise<JobLease | undefined> {
    if (this.held) {
      return undefined;
    }
    this.held = true;
    return { name, token: 'test-token' };
  }

  async release(): Promise<void> {
    this.releases += 1;
    if (this.failRelease) {
      throw new Error('release failed');
    }
    this.held = false;
  }
}
