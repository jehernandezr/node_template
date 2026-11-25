import type { RandomSource } from '@platform/kernel';

/** Decides whether a request emits debug logs. `rate` is a probability between 0 and 1. */
export class DebugSampler {
  constructor(
    private readonly rate: number,
    private readonly random: RandomSource,
  ) {}

  shouldSample(): boolean {
    if (!(this.rate > 0)) {
      return false;
    }
    if (this.rate >= 1) {
      return true;
    }
    return this.random.next() < this.rate;
  }
}
