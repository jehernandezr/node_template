import type { ConfigEnv } from '@platform/config';
import type { ServiceHostOptions } from '../runtime/service-host-options.js';
import type { ServiceHttpOptions } from './service-http-options.js';

/** Opciones de `ServiceBootstrap.http` y `ServiceBootstrap.worker`. */
export interface ServiceBootstrapOptions extends Omit<
  ServiceHostOptions,
  'env'
> {
  /** Por defecto `process.env`. */
  readonly env?: ConfigEnv;
  /** Solo lo usa `ServiceBootstrap.http`. */
  readonly http?: ServiceHttpOptions;
  /** Espera máxima de `RunningService.stop()` a que cierre todo. Por defecto 10 000 ms. */
  readonly shutdownGraceMs?: number;
}
