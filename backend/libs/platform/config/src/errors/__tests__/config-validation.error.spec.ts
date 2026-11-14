import { PlatformError } from '@platform/kernel';
import { ConfigErrorCode } from '../config-error-code.enum.js';
import { ConfigValidationError } from '../config-validation.error.js';

describe('ConfigValidationError', () => {
  it('extends PlatformError with a stable code', () => {
    const error = new ConfigValidationError([
      { path: 'A', code: 'custom', message: 'bad' },
    ]);

    expect(error).toBeInstanceOf(PlatformError);
    expect(error.code).toBe(ConfigErrorCode.Invalid);
    expect(error.name).toBe('ConfigValidationError');
  });

  it('is not retryable', () => {
    const error = new ConfigValidationError([
      { path: 'A', code: 'custom', message: 'bad' },
    ]);

    expect(error.retryable).toBe(false);
  });

  it('keeps the issues', () => {
    const issues = [{ path: 'A', code: 'custom', message: 'bad' }];

    expect(new ConfigValidationError(issues).issues).toEqual(issues);
  });

  it('lists each issue as PATH: message with a singular count', () => {
    const error = new ConfigValidationError([
      { path: 'SERVICE_NAME', code: 'too_small', message: 'required' },
    ]);

    expect(error.message).toBe(
      'Invalid configuration (1 issue):\n  SERVICE_NAME: required',
    );
  });

  it('lists each issue on its own line with a plural count', () => {
    const error = new ConfigValidationError([
      { path: 'LOG_LEVEL', code: 'invalid_value', message: 'expected a level' },
      {
        path: 'LOG_SAMPLE_RATE',
        code: 'custom',
        message: 'expected a number <= 1',
      },
    ]);

    expect(error.message).toBe(
      'Invalid configuration (2 issues):\n  LOG_LEVEL: expected a level\n  LOG_SAMPLE_RATE: expected a number <= 1',
    );
  });
});
