import { Inject, Injectable, type OnApplicationShutdown } from '@nestjs/common';
import { TelemetryHandle } from '../telemetry/telemetry-handle.js';
import { TELEMETRY } from './observability.tokens.js';

/** Flushes and shuts down telemetry when the application closes (`OnApplicationShutdown`, the last step). */
@Injectable()
export class TelemetryShutdownHook implements OnApplicationShutdown {
  constructor(@Inject(TELEMETRY) private readonly telemetry: TelemetryHandle) {}

  onApplicationShutdown(): Promise<void> {
    return this.telemetry.shutdown();
  }
}
