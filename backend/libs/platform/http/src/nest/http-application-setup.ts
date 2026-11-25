import type { INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppConfig } from '@platform/config';
import { HttpConfig } from '../http.config.js';

/**
 * Adjusts the Express application before it listens: `trust proxy` from `TRUST_PROXY_HOPS`, no
 * `x-powered-by`, CORS with `WEB_ORIGINS` and credentials, and turns off the body parsers Nest
 * registers by default. The body is read by `JsonBodyPolicyMiddleware` inside the pipeline, after
 * opening the request context: an Express parser runs before the Nest middlewares and
 * its errors would come out without `x-trace-id` or security headers. Reads the configuration from the
 * application container (`AppConfig` with `HttpConfig`), so `main.ts` creates it without arguments.
 *
 * It is structurally compatible with `HttpApplicationConfigurer` from `@platform/service/nest`;
 * it does not extend it so that `@platform/http` does not depend on `@platform/service`.
 */
export class HttpApplicationSetup {
  /** Nest does not register its parser if one with that name already exists; this one never applies to a request. */
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
