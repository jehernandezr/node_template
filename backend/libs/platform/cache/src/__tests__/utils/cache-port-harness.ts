import type { CachePort } from '../../cache-port.js';

/** Contract test harness: the port and the way to advance its clock. */
export interface CachePortHarness {
  readonly cache: CachePort;
  advance(ms: number): Promise<void>;
}
