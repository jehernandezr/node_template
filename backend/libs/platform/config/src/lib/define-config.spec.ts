import { z } from 'zod';
import { ConfigValidationError } from './errors.js';
import { defineConfig } from './define-config.js';
import {
  baseConfigSchema,
  DEFAULT_OTLP_ENDPOINT,
  NodeEnv,
} from './base-config.js';
import { LogLevel } from './log-level.js';
import { envNumber } from './env.js';

describe('defineConfig with baseConfigSchema', () => {
  const config = defineConfig(baseConfigSchema);

  it('loads defaults when only the required variable is present', () => {
    const loaded = config.load({ SERVICE_NAME: 'orders' });

    expect(loaded).toEqual({
      NODE_ENV: NodeEnv.Development,
      SERVICE_NAME: 'orders',
      LOG_LEVEL: LogLevel.Info,
      LOG_SAMPLE_RATE: 0,
      LOG_DEBUG_CONTEXTS: [],
      DB_LOG_QUERIES: false,
      DB_SLOW_QUERY_MS: 500,
      OTEL_SDK_DISABLED: false,
      OTEL_EXPORTER_OTLP_ENDPOINT: DEFAULT_OTLP_ENDPOINT,
      OTEL_METRIC_EXPORT_INTERVAL: 60_000,
    });
  });

  it('parses every variable when all are provided', () => {
    const loaded = config.load({
      NODE_ENV: 'production',
      SERVICE_NAME: ' orders ',
      LOG_LEVEL: 'warn',
      LOG_SAMPLE_RATE: '0.01',
      LOG_DEBUG_CONTEXTS: 'auth,reports',
      DB_LOG_QUERIES: 'true',
      DB_SLOW_QUERY_MS: '250',
    });

    expect(loaded).toMatchObject({
      NODE_ENV: NodeEnv.Production,
      SERVICE_NAME: 'orders',
      LOG_LEVEL: LogLevel.Warn,
      LOG_SAMPLE_RATE: 0.01,
      LOG_DEBUG_CONTEXTS: ['auth', 'reports'],
      DB_LOG_QUERIES: true,
      DB_SLOW_QUERY_MS: 250,
    });
  });

  it('treats empty variables as unset', () => {
    const loaded = config.load({
      SERVICE_NAME: 'orders',
      LOG_LEVEL: '',
      LOG_DEBUG_CONTEXTS: '',
    });
    expect(loaded.LOG_LEVEL).toBe(LogLevel.Info);
    expect(loaded.LOG_DEBUG_CONTEXTS).toEqual([]);
  });

  it('lists the path of a missing required variable', () => {
    let caught: unknown;
    try {
      config.load({});
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(ConfigValidationError);
    const error = caught as ConfigValidationError;
    expect(error.message).toContain('SERVICE_NAME: ');
    expect(error.issues.map((issue) => issue.path)).toContain('SERVICE_NAME');
  });

  it('lists every invalid key, not only the first', () => {
    expect(() =>
      config.load({
        SERVICE_NAME: 'orders',
        LOG_LEVEL: 'verbose',
        LOG_SAMPLE_RATE: '2',
      }),
    ).toThrow(ConfigValidationError);

    try {
      config.load({
        SERVICE_NAME: 'orders',
        LOG_LEVEL: 'verbose',
        LOG_SAMPLE_RATE: '2',
      });
    } catch (error) {
      const paths = (error as ConfigValidationError).issues.map(
        (issue) => issue.path,
      );
      expect(paths).toEqual(
        expect.arrayContaining(['LOG_LEVEL', 'LOG_SAMPLE_RATE']),
      );
      expect((error as ConfigValidationError).message).toMatch(
        /LOG_LEVEL: .+\n.*LOG_SAMPLE_RATE: /s,
      );
    }
  });

  it('never includes raw values in the error message', () => {
    const secret = 'sk_live_super_secret_value_42';
    let caught: unknown;
    try {
      config.load({
        SERVICE_NAME: 'orders',
        LOG_LEVEL: secret,
        LOG_SAMPLE_RATE: secret,
      });
    } catch (error) {
      caught = error;
    }

    const error = caught as ConfigValidationError;
    expect(error).toBeInstanceOf(ConfigValidationError);
    expect(error.message).not.toContain(secret);
    expect(error.issues.some((issue) => issue.message.includes(secret))).toBe(
      false,
    );
  });

  it('reads process.env when no environment is given', () => {
    const previous = process.env['SERVICE_NAME'];
    process.env['SERVICE_NAME'] = 'from-process-env';
    try {
      expect(config.load().SERVICE_NAME).toBe('from-process-env');
    } finally {
      if (previous === undefined) delete process.env['SERVICE_NAME'];
      else process.env['SERVICE_NAME'] = previous;
    }
  });
});

describe('a service extending baseConfigSchema', () => {
  const serviceConfigSchema = baseConfigSchema.extend({
    PORT: envNumber({ min: 1, max: 65535 }).default(3000),
    DATABASE_URL: z.url(),
    API_KEY: z.string().min(16),
  });
  const serviceConfig = defineConfig(serviceConfigSchema);

  it('inherits base variables and adds its own', () => {
    const loaded = serviceConfig.load({
      SERVICE_NAME: 'billing',
      DATABASE_URL: 'postgres://db.internal:5432/billing',
      API_KEY: 'a-very-long-api-key-value',
    });

    expect(loaded.SERVICE_NAME).toBe('billing');
    expect(loaded.LOG_LEVEL).toBe(LogLevel.Info);
    expect(loaded.PORT).toBe(3000);
  });

  it('reports the service-specific paths and keeps secrets out of the message', () => {
    const badApiKey = 'tooShortKey';
    const badUrl = 'not a url hunter2';

    let caught: unknown;
    try {
      serviceConfig.load({
        SERVICE_NAME: 'billing',
        DATABASE_URL: badUrl,
        API_KEY: badApiKey,
      });
    } catch (error) {
      caught = error;
    }

    const error = caught as ConfigValidationError;
    expect(error).toBeInstanceOf(ConfigValidationError);
    expect(error.issues.map((issue) => issue.path)).toEqual(
      expect.arrayContaining(['DATABASE_URL', 'API_KEY']),
    );
    expect(error.message).not.toContain(badApiKey);
    expect(error.message).not.toContain('hunter2');
  });
});
