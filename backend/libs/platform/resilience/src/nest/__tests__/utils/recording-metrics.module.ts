import { Global, Module } from '@nestjs/common';
import { RecordingMetricsPort } from '../../../__tests__/utils/recording-metrics-port.js';

/** Provee y exporta el puerto de métricas de prueba. */
@Global()
@Module({
  providers: [RecordingMetricsPort],
  exports: [RecordingMetricsPort],
})
export class RecordingMetricsModule {}
