import { TelemetryBootstrap } from '@platform/observability/setup';

export const telemetry = TelemetryBootstrap.start(process.env);
