import type { INestApplication } from '@nestjs/common';

/**
 * Port with which `@platform/http` (or the service) adjusts the HTTP application before it
 * listens: trust proxy, body limit, CORS, headers.
 */
export abstract class HttpApplicationConfigurer {
  abstract configure(app: INestApplication): void | Promise<void>;
}
