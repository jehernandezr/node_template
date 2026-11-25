import { PurgeableStore } from '@platform/kernel';

/** Purgeable store that records the cutoffs received and returns a programmable count. */
export class RecordingPurgeableStore extends PurgeableStore {
  readonly purgedBefore: Date[] = [];
  purged = 0;

  async purgeCompleted(before: Date): Promise<number> {
    this.purgedBefore.push(before);
    return this.purged;
  }
}
