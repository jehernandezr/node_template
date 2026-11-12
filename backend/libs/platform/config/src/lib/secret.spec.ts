import { PlatformError } from '@platform/kernel';
import { inspect } from 'node:util';
import { z } from 'zod';
import { defineConfig } from './define-config.js';
import { ConfigErrorCode, ConfigValidationError } from './errors.js';
import { Secret, SECRET_PLACEHOLDER, isSecret, secret } from './secret.js';

const RAW = 'p4ss-w0rd-raw-value';

describe('secret()', () => {
  const config = defineConfig(
    z.object({ DB_PASSWORD: secret({ minLength: 8 }) }),
  );

  it('parses to a Secret that reveals the value only on request', () => {
    const loaded = config.load({ DB_PASSWORD: RAW });
    expect(isSecret(loaded.DB_PASSWORD)).toBe(true);
    expect(loaded.DB_PASSWORD.reveal()).toBe(RAW);
  });

  it('is redacted in toString, template strings, JSON and inspect', () => {
    const loaded = config.load({ DB_PASSWORD: RAW });
    const all = [
      String(loaded.DB_PASSWORD),
      `${loaded.DB_PASSWORD}`,
      JSON.stringify(loaded),
      inspect(loaded, { depth: 5 }),
      inspect({ ...loaded }),
      JSON.stringify(Object.getOwnPropertyNames(loaded.DB_PASSWORD)),
    ].join('\n');
    expect(all).not.toContain(RAW);
    expect(JSON.stringify(loaded)).toBe(
      `{"DB_PASSWORD":"${SECRET_PLACEHOLDER}"}`,
    );
  });

  it('never puts the value in validation errors', () => {
    let caught: unknown;
    try {
      config.load({ DB_PASSWORD: 'short' });
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(ConfigValidationError);
    const message = (caught as Error).message;
    expect(message).toContain('DB_PASSWORD');
    expect(message).toContain('at least 8');
    expect(message).not.toContain('short');
    expect(
      JSON.stringify((caught as ConfigValidationError).issues),
    ).not.toContain('short');
  });

  it('reports a missing secret and enforces maxLength', () => {
    expect(() => config.load({})).toThrow(ConfigValidationError);
    const bounded = defineConfig(z.object({ K: secret({ maxLength: 3 }) }));
    expect(() => bounded.load({ K: RAW })).toThrow(/at most 3/);
  });

  it('works with defineConfig optional', () => {
    const optional = defineConfig(z.object({ K: secret().optional() }));
    expect(optional.load({}).K).toBeUndefined();
    expect(new Secret('x').reveal()).toBe('x');
  });
});

describe('ConfigValidationError', () => {
  it('extends PlatformError with a stable code', () => {
    const error = new ConfigValidationError([
      { path: 'A', code: 'custom', message: 'bad' },
    ]);
    expect(error).toBeInstanceOf(PlatformError);
    expect(error.code).toBe(ConfigErrorCode.Invalid);
    expect(error.name).toBe('ConfigValidationError');
  });
});
