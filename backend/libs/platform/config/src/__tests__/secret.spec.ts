import { inspect } from 'node:util';
import { z } from 'zod';
import { ConfigLoader } from '../config-loader.js';
import { ConfigValidationError } from '../errors/config-validation.error.js';
import { ConfigErrorCode } from '../errors/config-error-code.enum.js';
import { PlatformError } from '@platform/kernel';
import { Secret, SECRET_PLACEHOLDER, secret } from '../secret.js';

const RAW = 'p4ss-w0rd-raw-value';

describe('secret()', () => {
  const schema = z.object({ DB_PASSWORD: secret({ minLength: 8 }) });

  it('parses to a Secret that reveals the value only on request', () => {
    const loaded = new ConfigLoader({ DB_PASSWORD: RAW }).load(schema);

    expect(Secret.is(loaded.DB_PASSWORD)).toBe(true);
    expect(loaded.DB_PASSWORD.reveal()).toBe(RAW);
  });

  it('is redacted in toString, template strings, JSON and inspect', () => {
    const loaded = new ConfigLoader({ DB_PASSWORD: RAW }).load(schema);
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
      new ConfigLoader({ DB_PASSWORD: 'short' }).load(schema);
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
    expect(() => new ConfigLoader({}).load(schema)).toThrow(
      ConfigValidationError,
    );

    const bounded = z.object({ K: secret({ maxLength: 3 }) });
    expect(() => new ConfigLoader({ K: RAW }).load(bounded)).toThrow(
      /at most 3/,
    );
  });

  it('works with an optional secret', () => {
    const optional = z.object({ K: secret().optional() });

    expect(new ConfigLoader({}).load(optional).K).toBeUndefined();
    expect(new Secret('x').reveal()).toBe('x');
  });

  it('does not treat a plain string as a Secret', () => {
    expect(Secret.is(RAW)).toBe(false);
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
