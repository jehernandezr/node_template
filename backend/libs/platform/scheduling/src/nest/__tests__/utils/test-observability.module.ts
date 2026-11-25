import { Global, Module } from '@nestjs/common';
import {
  FakeLogger,
  RecordingMetrics,
} from '../../../__tests__/utils/index.js';

/** Provides the logger and metrics doubles that `SchedulingModule` injects. */
@Global()
@Module({
  providers: [FakeLogger, RecordingMetrics],
  exports: [FakeLogger, RecordingMetrics],
})
export class TestObservabilityModule {}
