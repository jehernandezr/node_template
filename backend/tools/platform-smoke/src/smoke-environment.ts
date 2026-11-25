import type { ConfigEnv } from '@platform/config';
import type { TelemetryHandle } from '@platform/observability';

/**
 * Bootstrap input: the environment that validates the configuration and, if present, the telemetry that
 * `instrumentation.ts` already started. Without telemetry, `ObservabilityModule` starts its own.
 */
export interface SmokeEnvironment {
  readonly env: ConfigEnv;
  readonly telemetry?: TelemetryHandle;
}
