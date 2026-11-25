import { RecordingProcessedOperationStore } from './recording-processed-operation-store.js';

/** In-memory store that signals every time someone renews a lease, to wait for the renewal without sleeping. */
export class RenewalSignalingStore extends RecordingProcessedOperationStore {
  renewals = 0;
  private waiting: Array<() => void> = [];

  /** Renews in memory and wakes whoever waits for the next renewal. */
  override async renew(
    key: string,
    claimToken: string,
    leaseUntilMs: number,
  ): Promise<boolean> {
    const renewed = await super.renew(key, claimToken, leaseUntilMs);
    this.renewals += 1;
    const waiting = this.waiting;
    this.waiting = [];
    for (const wake of waiting) {
      wake();
    }
    return renewed;
  }

  /** Resolves with the next renewal. */
  nextRenewal(): Promise<void> {
    return new Promise((resolve) => {
      this.waiting.push(resolve);
    });
  }
}
