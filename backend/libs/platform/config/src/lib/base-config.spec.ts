import {
  baseConfigSchema,
  DEFAULT_OTLP_ENDPOINT,
  NodeEnv,
} from './base-config.js';
import { defineConfig } from './define-config.js';
import { LogLevel } from './log-level.js';
import { isSecret } from './secret.js';

describe('baseConfigSchema', () => {
  const config = defineConfig(baseConfigSchema);

  it('requires SERVICE_NAME', () => {
    expect(baseConfigSchema.safeParse({}).success).toBe(false);
  });

  it('rejects a log level outside the enum', () => {
    const result = baseConfigSchema.safeParse({
      SERVICE_NAME: 'orders',
      LOG_LEVEL: 'trace',
    });
    expect(result.success).toBe(false);
  });

  it('exposes the enum values', () => {
    expect(Object.values(LogLevel)).toEqual(['debug', 'info', 'warn', 'error']);
    expect(Object.values(NodeEnv)).toEqual([
      'development',
      'test',
      'production',
    ]);
  });

  it('keeps SQL logging off by default and parses DB_LOG_QUERIES', () => {
    expect(config.load({ SERVICE_NAME: 'orders' }).DB_LOG_QUERIES).toBe(false);
    expect(
      config.load({ SERVICE_NAME: 'orders', DB_LOG_QUERIES: 'true' })
        .DB_LOG_QUERIES,
    ).toBe(true);
    expect(() =>
      config.load({ SERVICE_NAME: 'orders', DB_LOG_QUERIES: 'yes' }),
    ).toThrow();
  });

  it('does not carry cloud specific variables such as AWS_REGION', () => {
    const loaded = config.load({
      SERVICE_NAME: 'orders',
      AWS_REGION: 'us-east-1',
    });
    expect(loaded).not.toHaveProperty('AWS_REGION');
  });

  it('defaults the telemetry variables to the local Collector', () => {
    const loaded = config.load({ SERVICE_NAME: 'orders' });

    expect(loaded.OTEL_SDK_DISABLED).toBe(false);
    expect(loaded.OTEL_EXPORTER_OTLP_ENDPOINT).toBe(DEFAULT_OTLP_ENDPOINT);
    expect(loaded.OTEL_EXPORTER_OTLP_HEADERS).toBeUndefined();
    expect(loaded.OTEL_METRIC_EXPORT_INTERVAL).toBe(60_000);
    expect(loaded.SERVICE_VERSION).toBeUndefined();
  });

  it('keeps OTLP headers as a secret and validates the endpoint', () => {
    const loaded = config.load({
      SERVICE_NAME: 'orders',
      OTEL_EXPORTER_OTLP_HEADERS: 'authorization=Basic abc',
      OTEL_EXPORTER_OTLP_ENDPOINT: 'http://collector:4318',
      OTEL_SDK_DISABLED: '1',
      OTEL_METRIC_EXPORT_INTERVAL: '15000',
    });

    expect(isSecret(loaded.OTEL_EXPORTER_OTLP_HEADERS)).toBe(true);
    expect(JSON.stringify(loaded)).not.toContain('Basic abc');
    expect(loaded.OTEL_EXPORTER_OTLP_ENDPOINT).toBe('http://collector:4318');
    expect(loaded.OTEL_SDK_DISABLED).toBe(true);
    expect(loaded.OTEL_METRIC_EXPORT_INTERVAL).toBe(15_000);
    expect(() =>
      config.load({
        SERVICE_NAME: 'orders',
        OTEL_EXPORTER_OTLP_ENDPOINT: 'not a url',
      }),
    ).toThrow();
  });
});
