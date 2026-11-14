import { Global, Module } from '@nestjs/common';
import { FakeCachePort } from '../../../__tests__/utils/fake-cache-port.js';
import { RecordingMetricsPort } from '../../../__tests__/utils/recording-metrics-port.js';

/** Dobles del caché disponibles de forma global, para que el módulo los pueda inyectar por clase. */
@Global()
@Module({
  providers: [
    { provide: FakeCachePort, useFactory: () => new FakeCachePort() },
    {
      provide: RecordingMetricsPort,
      useFactory: () => new RecordingMetricsPort(),
    },
  ],
  exports: [FakeCachePort, RecordingMetricsPort],
})
export class CacheTestModule {}
