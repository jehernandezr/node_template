import type { Type } from '@nestjs/common';
import type { UsageCounterStore } from '../usage-counter-store.js';

/** Options of `MeteringModule.forRoot`. */
export interface MeteringModuleOptions {
  /** Name of the metering service; it prefixes the idempotency keys of what it sends. */
  readonly service: string;
  /**
   * Counters shared by the instances, for example `ValkeyUsageCounterStore`. Without a value, in-process
   * counters.
   */
  readonly counters?: Type<UsageCounterStore>;
}
