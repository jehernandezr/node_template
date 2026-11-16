import { z } from 'zod';
import { ConfigErrorCode } from '../errors/config-error-code.enum.js';
import { ConfigLoader } from '../config-loader.js';
import { ConfigValidationError } from '../errors/config-validation.error.js';
import { envNumber } from '../env.js';
import {
  ServiceConfig,
  serviceConfigSchema,
} from '../sections/service.config.js';
import { NodeEnv } from '../enums/node-env.enum.js';
import { ConfigSection } from '../config-section.js';

describe('ConfigLoader', () => {
  it('treats an empty variable as unset so the default applies', () => {
    const loaded = new ConfigLoader({
      SERVICE_NAME: 'orders',
      NODE_ENV: '',
    }).load(serviceConfigSchema);

    expect(loaded.NODE_ENV).toBe(NodeEnv.Development);
  });

  it('lists every problem at once in issues', () => {
    let caught: unknown;
    try {
      new ConfigLoader({ NODE_ENV: 'nope', DEPLOY_ENVIRONMENT: 'mars' }).load(
        serviceConfigSchema,
      );
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(ConfigValidationError);
    const paths = (caught as ConfigValidationError).issues.map(
      (issue) => issue.path,
    );
    expect(paths).toEqual(
      expect.arrayContaining([
        'SERVICE_NAME',
        'NODE_ENV',
        'DEPLOY_ENVIRONMENT',
      ]),
    );
  });

  it('never includes raw values in the message or the issues', () => {
    const leaked = 'sk_live_super_secret_value_42';

    let caught: unknown;
    try {
      new ConfigLoader({ SERVICE_NAME: 'orders', NODE_ENV: leaked }).load(
        serviceConfigSchema,
      );
    } catch (error) {
      caught = error;
    }

    const error = caught as ConfigValidationError;
    expect(error.message).not.toContain(leaked);
    expect(JSON.stringify(error.issues)).not.toContain(leaked);
  });

  it('loads a service schema extending serviceConfigSchema with its own variables', () => {
    const billingSchema = serviceConfigSchema.extend({
      PORT: envNumber({ min: 1, max: 65535 }).default(3000),
      DATABASE_URL: z.url(),
      API_KEY: z.string().min(16),
    });

    const loaded = new ConfigLoader({
      SERVICE_NAME: 'billing',
      DATABASE_URL: 'postgres://db.internal:5432/billing',
      API_KEY: 'a-very-long-api-key-value',
    }).load(billingSchema);

    expect(loaded.SERVICE_NAME).toBe('billing');
    expect(loaded.NODE_ENV).toBe(NodeEnv.Development);
    expect(loaded.PORT).toBe(3000);
  });

  it('reports the service-specific paths and keeps secrets out of the message', () => {
    const badApiKey = 'tooShortKey';
    const badUrl = 'not a url hunter2';
    const billingSchema = serviceConfigSchema.extend({
      DATABASE_URL: z.url(),
      API_KEY: z.string().min(16),
    });

    let caught: unknown;
    try {
      new ConfigLoader({
        SERVICE_NAME: 'billing',
        DATABASE_URL: badUrl,
        API_KEY: badApiKey,
      }).load(billingSchema);
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

  it('loads a section with the section schema', () => {
    const loaded = new ConfigLoader({ SERVICE_NAME: 'orders' }).loadSection(
      ServiceConfig,
    );

    expect(loaded).toMatchObject({ SERVICE_NAME: 'orders' });
  });

  it('fails with the section code when the section schema rejects the environment', () => {
    const section = new ConfigSection(
      'strict',
      z.object({ REQUIRED: z.string() }),
    );

    expect(() => new ConfigLoader({}).loadSection(section)).toThrow(
      expect.objectContaining({ code: ConfigErrorCode.Invalid }),
    );
  });
});
