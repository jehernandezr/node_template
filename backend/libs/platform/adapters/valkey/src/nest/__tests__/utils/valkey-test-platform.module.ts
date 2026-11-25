import { Global, Module, type DynamicModule } from '@nestjs/common';
import { ConfigModule } from '@platform/config/nest';
import { HealthRegistry, LoggerPort } from '@platform/observability';
import type { RecordingLogger } from '../../../__tests__/utils/recording-logger.js';
import { StaticTokenProvider } from '../../../__tests__/utils/static-token-provider.js';

/**
 * What a real application provides around the adapter: configuration,
 * observability and, on AWS, the token provider. It is global, as in the service.
 */
@Global()
@Module({})
export class ValkeyTestPlatformModule {
  static readonly ENV = {
    SERVICE_NAME: 'orders',
    // Nothing listens on port 1: the client is created without connecting.
    VALKEY_URL: 'redis://127.0.0.1:1',
  };

  static with(
    logger: RecordingLogger,
    env: Record<string, string> = ValkeyTestPlatformModule.ENV,
  ): DynamicModule {
    return {
      module: ValkeyTestPlatformModule,
      imports: [ConfigModule.forRoot({ env })],
      providers: [
        { provide: HealthRegistry, useFactory: () => new HealthRegistry() },
        { provide: LoggerPort, useValue: logger },
        StaticTokenProvider,
      ],
      exports: [HealthRegistry, LoggerPort, StaticTokenProvider],
    };
  }
}
