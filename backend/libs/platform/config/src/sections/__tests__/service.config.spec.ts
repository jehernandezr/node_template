import { ConfigLoader } from '../../config-loader.js';
import { ConfigValidationError } from '../../errors/config-validation.error.js';
import { DeployEnvironment } from '../../enums/deploy-environment.enum.js';
import { NodeEnv } from '../../enums/node-env.enum.js';
import { ServiceConfig } from '../service.config.js';

describe('ServiceConfig', () => {
  const load = (env: Readonly<Record<string, string | undefined>>) =>
    new ConfigLoader(env).loadSection(ServiceConfig);

  it('defaults NODE_ENV to development and DEPLOY_ENVIRONMENT to local', () => {
    const loaded = load({ SERVICE_NAME: 'orders' });

    expect(loaded.NODE_ENV).toBe(NodeEnv.Development);
    expect(loaded.DEPLOY_ENVIRONMENT).toBe(DeployEnvironment.Local);
  });

  it('requires SERVICE_NAME', () => {
    expect(() => load({})).toThrow(ConfigValidationError);
  });

  it('trims SERVICE_NAME', () => {
    expect(load({ SERVICE_NAME: '  orders  ' }).SERVICE_NAME).toBe('orders');
  });

  it('rejects a SERVICE_NAME that is only spaces', () => {
    expect(() => load({ SERVICE_NAME: '   ' })).toThrow(ConfigValidationError);
  });

  it('leaves SERVICE_VERSION optional', () => {
    expect(load({ SERVICE_NAME: 'orders' }).SERVICE_VERSION).toBeUndefined();
    expect(
      load({ SERVICE_NAME: 'orders', SERVICE_VERSION: '2.0.0' })
        .SERVICE_VERSION,
    ).toBe('2.0.0');
  });

  it.each([
    ['NODE_ENV', 'trace'],
    ['DEPLOY_ENVIRONMENT', 'qa'],
  ])('rejects an invalid %s', (key, value) => {
    expect(() => load({ SERVICE_NAME: 'orders', [key]: value })).toThrow(
      ConfigValidationError,
    );
  });
});
