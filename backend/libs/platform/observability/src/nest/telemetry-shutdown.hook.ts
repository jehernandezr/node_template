import { Inject, Injectable, type OnApplicationShutdown } from '@nestjs/common';
import { TelemetryHandle } from '../telemetry/telemetry-handle.js';
import { TELEMETRY } from './observability.tokens.js';

/** Vacía y apaga la telemetría al cerrar la aplicación (`OnApplicationShutdown`, el último paso). */
@Injectable()
export class TelemetryShutdownHook implements OnApplicationShutdown {
  constructor(@Inject(TELEMETRY) private readonly telemetry: TelemetryHandle) {}

  onApplicationShutdown(): Promise<void> {
    return this.telemetry.shutdown();
  }
}
