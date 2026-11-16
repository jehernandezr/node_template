import { Global, Module, type DynamicModule } from '@nestjs/common';
import { ConfigModule } from '@platform/config/nest';
import { HealthRegistry, LoggerPort } from '@platform/observability';
import type { RecordingLogger } from '../../../__tests__/utils/recording-logger.js';
import { StaticTokenProvider } from '../../../__tests__/utils/static-token-provider.js';

/**
 * Lo que una aplicación real aporta alrededor del adaptador: configuración,
 * observabilidad y, en AWS, el proveedor del token. Es global, como en el servicio.
 */
@Global()
@Module({})
export class ValkeyTestPlatformModule {
  static readonly ENV = {
    SERVICE_NAME: 'orders',
    // Nada escucha en el puerto 1: el cliente se crea sin conectar.
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
