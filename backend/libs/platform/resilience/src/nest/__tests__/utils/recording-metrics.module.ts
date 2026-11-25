import { Global, Module } from '@nestjs/common';
import { RecordingMetricsPort } from '../../../__tests__/utils/recording-metrics-port.js';

/** Provides and exports the test metrics port. */
@Global()
@Module({
  providers: [RecordingMetricsPort],
  exports: [RecordingMetricsPort],
})
export class RecordingMetricsModule {}
