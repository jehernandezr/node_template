import type { INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppConfig } from '@platform/config';
import { HttpConfig } from '../http.config.js';

/**
 * Ajusta la aplicación Express antes de que escuche: `trust proxy` desde `TRUST_PROXY_HOPS`, sin
 * `x-powered-by`, CORS con `WEB_ORIGINS` y credenciales, y apaga los parsers de cuerpo que Nest
 * registra por defecto. El cuerpo lo lee `JsonBodyPolicyMiddleware` dentro del pipeline, después de
 * abrir el contexto de la petición: un parser de Express corre antes que los middlewares de Nest y
 * sus errores saldrían sin `x-trace-id` ni encabezados de seguridad. Lee la configuración del
 * contenedor de la aplicación (`AppConfig` con `HttpConfig`), así `main.ts` lo crea sin argumentos.
 *
 * Es compatible de forma estructural con `HttpApplicationConfigurer` de `@platform/service/nest`;
 * no lo extiende para que `@platform/http` no dependa de `@platform/service`.
 */
export class HttpApplicationSetup {
  /** Nest no registra su parser si ya hay uno con ese nombre; este nunca aplica a una petición. */
  private static readonly NO_MEDIA_TYPE = (): boolean => false;

  configure(app: INestApplication): void {
    if (!HttpApplicationSetup.isExpress(app)) {
      throw new Error('HttpApplicationSetup solo soporta el adaptador Express');
    }
    const settings = app.get(AppConfig).get(HttpConfig);
    app.set(
      'trust proxy',
      settings.TRUST_PROXY_HOPS === 0 ? false : settings.TRUST_PROXY_HOPS,
    );
    app.disable('x-powered-by');
    app.enableCors({ origin: [...settings.WEB_ORIGINS], credentials: true });
    app.useBodyParser('json', { type: HttpApplicationSetup.NO_MEDIA_TYPE });
    app.useBodyParser('urlencoded', {
      type: HttpApplicationSetup.NO_MEDIA_TYPE,
    });
  }

  private static isExpress(
    app: INestApplication,
  ): app is NestExpressApplication {
    return app.getHttpAdapter().getType() === 'express';
  }
}
