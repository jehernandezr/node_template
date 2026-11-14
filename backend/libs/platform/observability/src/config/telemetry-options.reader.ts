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

/** Arma `TelemetryOptions` desde las secciones de configuración. */
export class TelemetryOptionsReader {
  private static readonly SCHEMA = serviceConfigSchema.extend(
    telemetryConfigSchema.shape,
  );

  /** Valida `ServiceConfig` y `TelemetryConfig` contra `env` y arma las opciones. */
  read(env: ConfigEnv): TelemetryOptions {
    const settings = new ConfigLoader(env).load(TelemetryOptionsReader.SCHEMA);
    return this.fromSettings(settings, settings);
  }

  /** Arma las opciones desde valores ya validados. */
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
