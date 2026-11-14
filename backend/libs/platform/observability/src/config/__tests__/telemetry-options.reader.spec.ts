import {
  ConfigErrorCode,
  ConfigValidationError,
  DeployEnvironment,
  NodeEnv,
} from '@platform/config';
import { TelemetryOptionsReader } from '../telemetry-options.reader.js';

const FULL_ENV = {
  SERVICE_NAME: 'orders',
  SERVICE_VERSION: '2.0.0',
  NODE_ENV: 'production',
  DEPLOY_ENVIRONMENT: 'staging',
  OTEL_EXPORTER_OTLP_ENDPOINT: 'http://collector:4318',
  OTEL_METRIC_EXPORT_INTERVAL: '10000',
};

describe('TelemetryOptionsReader', () => {
  it('maps the service and telemetry variables', () => {
    expect(new TelemetryOptionsReader().read(FULL_ENV)).toEqual({
      serviceName: 'orders',
      serviceVersion: '2.0.0',
      environment: 'staging',
      disabled: false,
      metricExportIntervalMs: 10_000,
    });
  });

  it('omits the service version when it is not set', () => {
    const options = new TelemetryOptionsReader().read({
      SERVICE_NAME: 'orders',
    });

    expect(options).not.toHaveProperty('serviceVersion');
  });

  it('reports every invalid variable together', () => {
    let caught: unknown;
    try {
      new TelemetryOptionsReader().read({ OTEL_METRIC_EXPORT_INTERVAL: '10' });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(ConfigValidationError);
    expect((caught as ConfigValidationError).code).toBe(
      ConfigErrorCode.Invalid,
    );
    expect(
      (caught as ConfigValidationError).issues.map((issue) => issue.path),
    ).toEqual(
      expect.arrayContaining(['SERVICE_NAME', 'OTEL_METRIC_EXPORT_INTERVAL']),
    );
  });

  it('builds the options from already validated settings', () => {
    const options = new TelemetryOptionsReader().fromSettings(
      {
        NODE_ENV: NodeEnv.Test,
        SERVICE_NAME: 'billing',
        DEPLOY_ENVIRONMENT: DeployEnvironment.Dev,
        SERVICE_VERSION: '0.1.0',
      },
      { OTEL_SDK_DISABLED: true, OTEL_METRIC_EXPORT_INTERVAL: 5_000 },
    );

    expect(options).toEqual({
      serviceName: 'billing',
      serviceVersion: '0.1.0',
      environment: 'dev',
      disabled: true,
      metricExportIntervalMs: 5_000,
    });
  });
});
