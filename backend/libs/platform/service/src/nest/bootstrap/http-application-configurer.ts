import type { INestApplication } from '@nestjs/common';

/**
 * Port with which `@platform/http` (or the service) adjusts the HTTP application before it
 * listens: trust proxy, body limit, CORS, headers.
 */
export abstract class HttpApplicationConfigurer {
  /**
   * Configures the HTTP application before it listens: CORS, security headers and body limits.
   * @param app Nest application.
   */
  abstract configure(app: INestApplication): void | Promise<void>;
}
