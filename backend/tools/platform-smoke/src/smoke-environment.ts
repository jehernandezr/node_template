import type { ConfigEnv } from '@platform/config';
import type { TelemetryHandle } from '@platform/observability';

/**
 * Entrada del arranque: el entorno que valida la configuración y, si la hay, la telemetría que ya
 * arrancó `instrumentation.ts`. Sin telemetría, `ObservabilityModule` arranca la suya.
 */
export interface SmokeEnvironment {
  readonly env: ConfigEnv;
  readonly telemetry?: TelemetryHandle;
}
