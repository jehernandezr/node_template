import type { Abstract, Type } from '@nestjs/common';
import type { JobLock } from '@platform/kernel';
import type { LoggerPort, MetricsPort } from '@platform/observability';
import type { SchedulingMode } from '../scheduling-mode.enum.js';

/**
 * `SchedulingModule` options that can come from configuration, so
 * `forRootAsync` builds them with a factory.
 */
export interface SchedulingModuleOptions {
  /** `SchedulingMode.InProcess` by default. */
  readonly mode?: SchedulingMode;
  /** Time that `stop` waits for running jobs on shutdown. 10 000 ms by default. */
  readonly shutdownGraceMs?: number;
}

/**
 * Adapters of `SchedulingModule`. They are passed as a type or token, not as an
 * instance, and are fixed when composing the module: they are the same in `forRoot` and in `forRootAsync`.
 */
export interface SchedulingModuleExtras {
  /** `LoggerPort` implementation provided by the service observability. */
  readonly logger: Type<LoggerPort> | Abstract<LoggerPort>;
  /** `InProcessJobLock` by default; with several processes, `ValkeyJobLock`. */
  readonly lock?: Type<JobLock> | Abstract<JobLock>;
  /** `MetricsPort` implementation provided by the service observability. */
  readonly metrics: Type<MetricsPort> | Abstract<MetricsPort>;
}
