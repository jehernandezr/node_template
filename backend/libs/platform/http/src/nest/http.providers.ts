import type { Provider } from '@nestjs/common';
import { ProblemDetailsFactory } from '@contracts/platform';
import {
  AccessEvaluator,
  AccessResolver,
  AccessTokenVerifier,
  ApiKeyAuthenticator,
} from '@platform/auth';
import { TokenAudience } from '@contracts/identity';
import { Clock } from '@platform/kernel';
import { RateLimiter } from '@platform/rate-limit';
import { ApiVersionPolicy } from '../api-version.policy.js';
import { EndpointAuthorizer } from '../endpoint-authorizer.js';
import { ErrorCatalogRegistry } from '../error-catalog-registry.js';
import { HttpConfig, type HttpSettings } from '../http.config.js';
import { HttpRouteRegistry } from '../http-route-registry.js';
import { JsonBodyReader } from '../json-body-reader.js';
import type { HttpModuleOptions } from './http-module-options.js';
import { OriginPolicy } from '../origin-policy.js';
import { ProblemDetailsMapper } from '../problem-details-mapper.js';
import { RateLimitGate } from '../rate-limit-gate.js';
import { RateLimitTierRules } from '../rate-limit-tier-rules.js';
import { RequestAuthenticator } from '../request-authenticator.js';
import { ContractOutputInterceptor } from './contract-output.interceptor.js';
import { EndpointContextInterceptor } from './endpoint-context.interceptor.js';
import { EndpointGuard } from './endpoint.guard.js';
import { HttpEndpointReader } from './http-endpoint.reader.js';
import { HttpRouteExplorer } from './http-route.explorer.js';
import { ProblemDetailsFilter } from './problem-details.filter.js';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';

/** Providers of `HttpModule`: the guard, the interceptors, the filter and the pieces they use. */
export class HttpProviders {
  static build(options: HttpModuleOptions): Provider[] {
    return [
      {
        provide: ErrorCatalogRegistry,
        useFactory: () => new ErrorCatalogRegistry(options.catalogs ?? []),
      },
      {
        provide: ProblemDetailsMapper,
        useFactory: (registry: ErrorCatalogRegistry, settings: HttpSettings) =>
          new ProblemDetailsMapper(
            registry,
            new ProblemDetailsFactory(settings.PROBLEM_TYPE_BASE_URL),
          ),
        inject: [ErrorCatalogRegistry, HttpConfig.token],
      },
      { provide: ApiVersionPolicy, useFactory: () => new ApiVersionPolicy() },
      {
        provide: RateLimitTierRules,
        useFactory: () => new RateLimitTierRules(),
      },
      { provide: HttpRouteRegistry, useFactory: () => new HttpRouteRegistry() },
      { provide: JsonBodyReader, useFactory: () => new JsonBodyReader() },
      {
        provide: OriginPolicy,
        useFactory: (settings: HttpSettings) =>
          new OriginPolicy(settings.WEB_ORIGINS),
        inject: [HttpConfig.token],
      },
      {
        provide: RequestAuthenticator,
        useFactory: (
          verifier: AccessTokenVerifier,
          apiKeys: ApiKeyAuthenticator,
        ) =>
          new RequestAuthenticator(
            verifier,
            apiKeys,
            options.audience ?? TokenAudience.Api,
          ),
        inject: [AccessTokenVerifier, ApiKeyAuthenticator],
      },
      {
        provide: EndpointAuthorizer,
        useFactory: (
          resolver: AccessResolver,
          evaluator: AccessEvaluator,
          clock: Clock,
        ) => new EndpointAuthorizer(resolver, evaluator, clock),
        inject: [AccessResolver, AccessEvaluator, Clock],
      },
      {
        provide: RateLimitGate,
        useFactory: (limiter: RateLimiter, rules: RateLimitTierRules) =>
          new RateLimitGate(limiter, rules),
        inject: [RateLimiter, RateLimitTierRules],
      },
      HttpEndpointReader,
      HttpRouteExplorer,
      { provide: APP_GUARD, useClass: EndpointGuard },
      { provide: APP_INTERCEPTOR, useClass: EndpointContextInterceptor },
      { provide: APP_INTERCEPTOR, useClass: ContractOutputInterceptor },
      { provide: APP_FILTER, useClass: ProblemDetailsFilter },
    ];
  }

  /** What `HttpModule` exports to the modules that import it. */
  static exports(): Array<
    symbol | (abstract new (...args: never[]) => object)
  > {
    return [
      ErrorCatalogRegistry,
      HttpRouteRegistry,
      ApiVersionPolicy,
      RateLimitTierRules,
    ];
  }
}
