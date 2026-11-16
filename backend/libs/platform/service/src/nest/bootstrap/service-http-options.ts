import type { AbstractHttpAdapter } from '@nestjs/core';
import type { HttpApplicationConfigurer } from './http-application-configurer.js';

/** Cómo escucha el proceso HTTP. */
export interface ServiceHttpOptions {
  /** Por defecto 3000. Con 0 el sistema operativo elige uno libre. */
  readonly port?: number;
  /** Por defecto `0.0.0.0`. */
  readonly host?: string;
  /** Adaptador HTTP de Nest. Sin valor, Nest carga `@nestjs/platform-express`. */
  readonly adapter?: AbstractHttpAdapter;
  readonly configurer?: HttpApplicationConfigurer;
}
