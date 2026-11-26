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
 * HTTP entry of a service on NestJS: middlewares, guard, interceptors, pipe and filter
 * of the contract-driven route. It is global and requires `ObservabilityModule`, `AuthModule` and
 * `RateLimitModule`.
 */
@Module({})
export class HttpModule implements NestModule {
  /**
   * Registers the contract routes, errors, rate limits and HTTP adapters.
   * @param options Contract, error catalogs and adapters.
   * @returns The module.
   */
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
   * Registers, in this order, `RequestContextMiddleware`, `SecurityHeadersMiddleware`,
   * `OriginPolicyMiddleware` and `JsonBodyPolicyMiddleware` on all routes.
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
