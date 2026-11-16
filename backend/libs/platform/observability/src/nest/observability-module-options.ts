import type { TelemetryHandle } from '../telemetry/telemetry-handle.js';

export interface ObservabilityModuleOptions {
  /**
   * Telemetría ya arrancada con `TelemetryBootstrap.start` en `instrumentation.ts`.
   * Sin valor, el módulo arranca una con `ServiceConfig` y `TelemetryConfig`;
   * en ese caso la instrumentación automática llega tarde.
   */
  readonly telemetry?: TelemetryHandle;
}
