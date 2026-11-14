import { Global, Module } from '@nestjs/common';
import { FakeRateLimiter } from '../../../__tests__/utils/fake-rate-limiter.js';
import { RecordingLogger } from '../../../__tests__/utils/recording-logger.js';
import { RecordingMetricsPort } from '../../../__tests__/utils/recording-metrics-port.js';

/** Provee y exporta los dobles de prueba que el módulo recibe como extras. */
@Global()
@Module({
  providers: [
    { provide: FakeRateLimiter, useFactory: () => new FakeRateLimiter() },
    RecordingMetricsPort,
    RecordingLogger,
  ],
  exports: [FakeRateLimiter, RecordingMetricsPort, RecordingLogger],
})
export class RateLimitTestModule {}
