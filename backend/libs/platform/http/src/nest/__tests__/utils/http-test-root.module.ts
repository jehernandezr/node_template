import { KernelModule } from '@platform/kernel/nest';
import { Module, type DynamicModule, type Type } from '@nestjs/common';
import { AuthModule } from '@platform/auth/nest';
import {
  FakeAccessGrantSource,
  FakeApiKeyResolver,
  InMemoryAuthState,
  TestKeyPair,
} from '@platform/auth/test-utils';
import { StaticJwksKeySource } from '@platform/auth';
import { ConfigModule } from '@platform/config/nest';
import { ObservabilityModule } from '@platform/observability/nest';
import { RateLimitModule } from '@platform/rate-limit/nest';
import type { ServiceContract, ErrorCatalogEntry } from '@contracts/platform';
import { HttpModule } from '../../http.module.js';
import { AuthDoublesModule } from './auth-doubles.module.js';

/** Root module of the test app: configuration, observability, auth with doubles and the HTTP entry. */
@Module({})
export class HttpTestRootModule {
  static forRoot(params: {
    readonly keys: TestKeyPair;
    readonly controllers: Type<unknown>[];
    readonly contract: ServiceContract;
    readonly catalogs: readonly (readonly ErrorCatalogEntry[])[];
    readonly env: Record<string, string>;
    readonly validateOutput?: boolean;
  }): DynamicModule {
    return {
      module: HttpTestRootModule,
      imports: [
        KernelModule,
        ConfigModule.forRoot({
          env: {
            SERVICE_NAME: 'demo',
            AUTH_ISSUER: 'https://identity.test',
            OTEL_SDK_DISABLED: 'true',
            WEB_ORIGINS: 'https://app.test',
            ...params.env,
          },
        }),
        ObservabilityModule.forRoot(),
        AuthDoublesModule.forKeys(params.keys),
        AuthModule.forRoot({
          source: InMemoryAuthState,
          feed: InMemoryAuthState,
          accessGrants: FakeAccessGrantSource,
          apiKeyResolver: FakeApiKeyResolver,
          jwks: StaticJwksKeySource,
        }),
        RateLimitModule.forRoot({}),
        HttpModule.forRoot({
          contract: params.contract,
          catalogs: params.catalogs,
          validateOutput: params.validateOutput,
        }),
      ],
      controllers: params.controllers,
    };
  }
}
