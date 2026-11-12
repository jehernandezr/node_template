import { baseConfigSchema, ConfigLogLevel, NodeEnv } from './base-config.js';

describe('baseConfigSchema', () => {
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
    expect(Object.values(ConfigLogLevel)).toEqual([
      'debug',
      'info',
      'warn',
      'error',
    ]);
    expect(Object.values(NodeEnv)).toEqual([
      'development',
      'test',
      'production',
    ]);
  });
});
