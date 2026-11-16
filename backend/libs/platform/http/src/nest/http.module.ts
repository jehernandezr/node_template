import {
  Module,
  RequestMethod,
  type DynamicModule,
  type MiddlewareConsumer,
  type NestModule,
} from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { ConfigModule } from '@platform/config/nest';
import { ServiceConfig } from '@platform/config';
import { RequestContextMiddleware } from '@platform/observability/nest';
import { HttpConfig } from '../http.config.js';
import type { HttpModuleOptions } from './http-module-options.js';
import { HttpProviders } from './http.providers.js';
import { HTTP_OPTIONS } from './http.tokens.js';
import { JsonBodyPolicyMiddleware } from './json-body-policy.middleware.js';
import { OriginPolicyMiddleware } from './origin-policy.middleware.js';
import { SecurityHeadersMiddleware } from './security-headers.middleware.js';

/**
 * Entrada HTTP de un servicio sobre NestJS: middlewares, guard, interceptores, pipe y filtro
 * de la ruta guiada por el contrato. Es global y exige `ObservabilityModule`, `AuthModule` y
 * `RateLimitModule`.
 */
@Module({})
export class HttpModule implements NestModule {
  static forRoot(options: HttpModuleOptions): DynamicModule {
    return {
      module: HttpModule,
      global: true,
      imports: [
        ConfigModule.forFeature(HttpConfig),
        ConfigModule.forFeature(ServiceConfig),
        DiscoveryModule,
      ],
      providers: [
        { provide: HTTP_OPTIONS, useValue: options },
        ...HttpProviders.build(options),
      ],
      exports: HttpProviders.exports(),
    };
  }

  /**
   * Registra, en este orden, `RequestContextMiddleware`, `SecurityHeadersMiddleware`,
   * `OriginPolicyMiddleware` y `JsonBodyPolicyMiddleware` en todas las rutas.
   */
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(
        RequestContextMiddleware,
        SecurityHeadersMiddleware,
        OriginPolicyMiddleware,
        JsonBodyPolicyMiddleware,
      )
      .forRoutes({ path: '{*path}', method: RequestMethod.ALL });
  }
}
