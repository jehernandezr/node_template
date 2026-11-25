import { ConfigSection, envBoolean, envNumber } from '@platform/config';
import { z } from 'zod';

/**
 * The `OTEL_EXPORTER_OTLP_*` variables (endpoint, headers, protocol) are not
 * here: the OTLP exporters read them from the environment with the rules of the
 * standard, and a second read could interpret them differently.
 */
export const telemetryConfigSchema = z.object({
  /** Turns off the OpenTelemetry SDK: no OTLP traces, metrics or logs are exported. */
  OTEL_SDK_DISABLED: envBoolean().default(false),
  /** Metrics export interval, in milliseconds. */
  OTEL_METRIC_EXPORT_INTERVAL: envNumber({ min: 1000 }).default(60_000),
});

export type TelemetrySettings = z.infer<typeof telemetryConfigSchema>;

export const TelemetryConfig = new ConfigSection<TelemetrySettings>(
  'telemetry',
  telemetryConfigSchema,
);
