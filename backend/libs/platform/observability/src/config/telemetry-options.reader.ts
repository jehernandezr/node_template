import {
  ConfigLoader,
  serviceConfigSchema,
  type ConfigEnv,
  type ServiceSettings,
} from '@platform/config';
import type { TelemetryOptions } from '../telemetry/telemetry-options.js';
import {
  telemetryConfigSchema,
  type TelemetrySettings,
} from './telemetry.config.js';

/** Builds `TelemetryOptions` from the configuration sections. */
export class TelemetryOptionsReader {
  private static readonly SCHEMA = serviceConfigSchema.extend(
    telemetryConfigSchema.shape,
  );

  /** Validates `ServiceConfig` and `TelemetryConfig` against `env` and builds the options. */
  read(env: ConfigEnv): TelemetryOptions {
    const settings = new ConfigLoader(env).load(TelemetryOptionsReader.SCHEMA);
    return this.fromSettings(settings, settings);
  }

  /** Builds the options from already validated values. */
  fromSettings(
    service: ServiceSettings,
    telemetry: TelemetrySettings,
  ): TelemetryOptions {
    return {
      serviceName: service.SERVICE_NAME,
      ...(service.SERVICE_VERSION !== undefined && {
        serviceVersion: service.SERVICE_VERSION,
      }),
      environment: service.DEPLOY_ENVIRONMENT,
      disabled: telemetry.OTEL_SDK_DISABLED,
      metricExportIntervalMs: telemetry.OTEL_METRIC_EXPORT_INTERVAL,
    };
  }
}
