import type { TelemetryHandle } from '../telemetry/telemetry-handle.js';

export interface ObservabilityModuleOptions {
  /**
   * Telemetry already started with `TelemetryBootstrap.start` in `instrumentation.ts`.
   * Without a value, the module starts one with `ServiceConfig` and `TelemetryConfig`;
   * in that case automatic instrumentation arrives late.
   */
  readonly telemetry?: TelemetryHandle;
}
