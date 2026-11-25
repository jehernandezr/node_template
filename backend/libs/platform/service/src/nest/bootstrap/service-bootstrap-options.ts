import type { ConfigEnv } from '@platform/config';
import type { ServiceHostOptions } from '../runtime/service-host-options.js';
import type { ServiceHttpOptions } from './service-http-options.js';

/** Options of `ServiceBootstrap.http` and `ServiceBootstrap.worker`. */
export interface ServiceBootstrapOptions extends Omit<
  ServiceHostOptions,
  'env'
> {
  /** `process.env` by default. */
  readonly env?: ConfigEnv;
  /** Used only by `ServiceBootstrap.http`. */
  readonly http?: ServiceHttpOptions;
  /** Maximum time `RunningService.stop()` waits for everything to close. 10 000 ms by default. */
  readonly shutdownGraceMs?: number;
}
