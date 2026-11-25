import type { AbstractHttpAdapter } from '@nestjs/core';
import type { HttpApplicationConfigurer } from './http-application-configurer.js';

/** How the HTTP process listens. */
export interface ServiceHttpOptions {
  /** 3000 by default. With 0 the operating system picks a free one. */
  readonly port?: number;
  /** `0.0.0.0` by default. */
  readonly host?: string;
  /** Nest HTTP adapter. Without a value, Nest loads `@nestjs/platform-express`. */
  readonly adapter?: AbstractHttpAdapter;
  readonly configurer?: HttpApplicationConfigurer;
}
