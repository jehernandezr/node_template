import type { INestApplication } from '@nestjs/common';

/**
 * Puerto con el que `@platform/http` (o el servicio) ajusta la aplicación HTTP antes de que
 * escuche: trust proxy, límite del cuerpo, CORS, encabezados.
 */
export abstract class HttpApplicationConfigurer {
  abstract configure(app: INestApplication): void | Promise<void>;
}
