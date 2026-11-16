import { ConfigLoader, ConfigValidationError } from '@platform/config';
import { TelemetryConfig } from '../telemetry.config.js';

const load = (env: Readonly<Record<string, string | undefined>>) =>
  new ConfigLoader(env).loadSection(TelemetryConfig);

describe('TelemetryConfig', () => {
  it('defaults to an enabled SDK and a 60 second metric export interval', () => {
    expect(load({})).toEqual({
      OTEL_SDK_DISABLED: false,
      OTEL_METRIC_EXPORT_INTERVAL: 60_000,
    });
  });

  it('parses the telemetry switches', () => {
    expect(
      load({ OTEL_SDK_DISABLED: '1', OTEL_METRIC_EXPORT_INTERVAL: '15000' }),
    ).toEqual({
      OTEL_SDK_DISABLED: true,
      OTEL_METRIC_EXPORT_INTERVAL: 15_000,
    });
  });

  it('leaves the OTLP_* variables to the SDK', () => {
    const loaded = load({
      OTEL_EXPORTER_OTLP_HEADERS: 'authorization=Basic abc',
    });

    expect(Object.keys(loaded)).toEqual([
      'OTEL_SDK_DISABLED',
      'OTEL_METRIC_EXPORT_INTERVAL',
    ]);
    expect(JSON.stringify(loaded)).not.toContain('Basic abc');
  });

  it('rejects an export interval under one second', () => {
    expect(() => load({ OTEL_METRIC_EXPORT_INTERVAL: '999' })).toThrow(
      ConfigValidationError,
    );
  });

  it('rejects a boolean that is not a valid switch value', () => {
    expect(() => load({ OTEL_SDK_DISABLED: 'yes' })).toThrow(
      ConfigValidationError,
    );
  });
});
