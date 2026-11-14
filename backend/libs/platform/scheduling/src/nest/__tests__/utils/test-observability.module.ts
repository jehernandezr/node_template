import { Global, Module } from '@nestjs/common';
import {
  FakeLogger,
  RecordingMetrics,
} from '../../../__tests__/utils/index.js';

/** Provee los dobles de logger y métricas que `SchedulingModule` inyecta. */
@Global()
@Module({
  providers: [FakeLogger, RecordingMetrics],
  exports: [FakeLogger, RecordingMetrics],
})
export class TestObservabilityModule {}
