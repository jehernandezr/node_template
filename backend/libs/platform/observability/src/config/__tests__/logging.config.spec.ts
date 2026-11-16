import { ConfigLoader, ConfigValidationError } from '@platform/config';
import { LogLevel } from '../../logging/log-level.enum.js';
import { LoggingConfig } from '../logging.config.js';

const load = (env: Readonly<Record<string, string | undefined>>) =>
  new ConfigLoader(env).loadSection(LoggingConfig);

describe('LoggingConfig', () => {
  it('defaults to info, sampling off and no debug contexts', () => {
    expect(load({})).toEqual({
      LOG_LEVEL: LogLevel.Info,
      LOG_SAMPLE_RATE: 0,
      LOG_DEBUG_CONTEXTS: [],
    });
  });

  it('exposes only the LOG_* keys', () => {
    expect(Object.keys(load({}))).toEqual([
      'LOG_LEVEL',
      'LOG_SAMPLE_RATE',
      'LOG_DEBUG_CONTEXTS',
    ]);
  });

  it('parses every variable when all are provided', () => {
    expect(
      load({
        LOG_LEVEL: 'warn',
        LOG_SAMPLE_RATE: '0.01',
        LOG_DEBUG_CONTEXTS: 'auth,reports',
      }),
    ).toEqual({
      LOG_LEVEL: LogLevel.Warn,
      LOG_SAMPLE_RATE: 0.01,
      LOG_DEBUG_CONTEXTS: ['auth', 'reports'],
    });
  });

  it('treats empty variables as unset', () => {
    expect(load({ LOG_LEVEL: '', LOG_DEBUG_CONTEXTS: '' })).toMatchObject({
      LOG_LEVEL: LogLevel.Info,
      LOG_DEBUG_CONTEXTS: [],
    });
  });

  it('trims and drops empty entries of the debug contexts', () => {
    expect(
      load({ LOG_DEBUG_CONTEXTS: ' auth , ,reports ' }).LOG_DEBUG_CONTEXTS,
    ).toEqual(['auth', 'reports']);
  });

  it.each(['-0.1', '1.5', 'abc'])('rejects LOG_SAMPLE_RATE %s', (rate) => {
    expect(() => load({ LOG_SAMPLE_RATE: rate })).toThrow(
      ConfigValidationError,
    );
  });

  it('rejects a log level outside the enum', () => {
    expect(() => load({ LOG_LEVEL: 'trace' })).toThrow(ConfigValidationError);
  });

  it('exposes the log level values', () => {
    expect(Object.values(LogLevel)).toEqual(['debug', 'info', 'warn', 'error']);
  });
});
