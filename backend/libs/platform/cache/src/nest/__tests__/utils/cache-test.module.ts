import { Global, Module } from '@nestjs/common';
import { FakeCachePort } from '../../../__tests__/utils/fake-cache-port.js';
import { RecordingMetricsPort } from '../../../__tests__/utils/recording-metrics-port.js';

/** Cache doubles available globally, so the module can inject them by class. */
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
