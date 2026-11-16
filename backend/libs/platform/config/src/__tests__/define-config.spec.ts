import { z } from 'zod';
import {
  defineConfig,
  serviceConfigSchema,
  ConfigValidationError,
} from '../index.js';

describe('defineConfig', () => {
  const config = defineConfig(serviceConfigSchema);

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('loads the given environment', () => {
    expect(config.load({ SERVICE_NAME: ' orders ' }).SERVICE_NAME).toBe(
      'orders',
    );
  });

  it('throws ConfigValidationError for an invalid environment', () => {
    expect(() => config.load({})).toThrow(ConfigValidationError);
  });

  it('falls back to the process environment when none is given', () => {
    jest.replaceProperty(process, 'env', { SERVICE_NAME: 'from-process-env' });

    expect(config.load().SERVICE_NAME).toBe('from-process-env');
  });

  it('keeps accepting plain zod schemas', () => {
    const plain = defineConfig(z.object({ PORT: z.string().default('3000') }));

    expect(plain.load({}).PORT).toBe('3000');
  });
});
