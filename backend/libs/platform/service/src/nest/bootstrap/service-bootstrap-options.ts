import type { ConfigEnv } from '@platform/config';
import type { ServiceHostOptions } from '../runtime/service-host-options.js';
import type { ServiceApplicationFactory } from './service-application-factory.js';
import type { ServiceHttpOptions } from './service-http-options.js';

/** Options of `ServiceBootstrap.http`, `ServiceBootstrap.worker` and `ServiceBootstrap.task`; the entry point decides whether queues are polled. */
export interface ServiceBootstrapOptions extends Omit<
  ServiceHostOptions,
  'env' | 'consumeQueues'
> {
  /** `process.env` by default. */
  readonly env?: ConfigEnv;
  /** Used only by `ServiceBootstrap.http`. */
  readonly http?: ServiceHttpOptions;
  /** Maximum time `RunningService.stop()` waits for everything to close. 10 000 ms by default. */
  readonly shutdownGraceMs?: number;
  /** Creates the Nest application; `NestServiceApplicationFactory` by default. */
  readonly applications?: ServiceApplicationFactory;
}
