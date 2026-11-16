import type { RandomSource } from '@platform/kernel';

/** Decide si una petición emite logs de debug. `rate` es una probabilidad entre 0 y 1. */
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
