import { z } from 'zod';
import { ConfigErrorCode } from '../errors/config-error-code.enum.js';
import { ConfigValidationError } from '../errors/config-validation.error.js';
import { ConfigLoader } from '../config-loader.js';
import { ConfigRegistry } from '../config-registry.js';
import { ConfigSection } from '../config-section.js';
import { envBoolean, envNumber } from '../env.js';
import { RegistryAppConfig } from '../registry-app-config.js';
import { ServiceConfig } from '../sections/service.config.js';
import { DeployEnvironment } from '../enums/deploy-environment.enum.js';
import { NodeEnv } from '../enums/node-env.enum.js';

const BILLING = new ConfigSection(
  'billing',
  z.object({
    BILLING_TIMEOUT_MS: envNumber({ min: 1 }).default(5000),
    BILLING_ENABLED: envBoolean().default(true),
  }),
);

function build(env: Readonly<Record<string, string | undefined>>) {
  const registry = new ConfigRegistry();
  const config = new RegistryAppConfig(new ConfigLoader(env), registry);
  return { config, registry };
}

describe('RegistryAppConfig', () => {
  it('loads a section lazily with its defaults on the first get', () => {
    const { config, registry } = build({ SERVICE_NAME: 'orders' });
    expect(registry.find(BILLING)).toBeUndefined();

    const billing = config.get(BILLING);

    expect(billing).toEqual({
      BILLING_TIMEOUT_MS: 5000,
      BILLING_ENABLED: true,
    });
    expect(registry.find(BILLING)).toEqual(billing);
  });

  it('returns the same reference on every get', () => {
    const { config } = build({ SERVICE_NAME: 'orders' });

    expect(config.get(ServiceConfig)).toBe(config.get(ServiceConfig));
  });

  it('returns frozen values', () => {
    const { config } = build({ SERVICE_NAME: 'orders' });

    expect(Object.isFrozen(config.get(ServiceConfig))).toBe(true);
  });

  it('applies the environment values of a section', () => {
    const { config } = build({
      SERVICE_NAME: 'orders',
      NODE_ENV: 'production',
      DEPLOY_ENVIRONMENT: 'staging',
    });

    expect(config.get(ServiceConfig)).toMatchObject({
      SERVICE_NAME: 'orders',
      NODE_ENV: NodeEnv.Production,
      DEPLOY_ENVIRONMENT: DeployEnvironment.Staging,
    });
  });

  it('throws ConfigValidationError listing every invalid variable of the section', () => {
    const { config } = build({
      SERVICE_NAME: '',
      NODE_ENV: 'nope',
      DEPLOY_ENVIRONMENT: 'mars',
    });

    let caught: unknown;
    try {
      config.get(ServiceConfig);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(ConfigValidationError);
    expect(
      (caught as ConfigValidationError).issues.map((issue) => issue.path),
    ).toEqual(
      expect.arrayContaining([
        'SERVICE_NAME',
        'NODE_ENV',
        'DEPLOY_ENVIRONMENT',
      ]),
    );
  });

  it('returns the root value after setRoot', () => {
    const { config, registry } = build({});
    registry.setRoot({ FEATURE: 'on' });

    expect(config.root<{ FEATURE: string }>()).toEqual({ FEATURE: 'on' });
  });

  it('rejects root() when no root schema is configured', () => {
    const { config } = build({});

    expect(() => config.root()).toThrow(ConfigValidationError);
    expect(() => config.root()).toThrow(
      expect.objectContaining({ code: ConfigErrorCode.Invalid }),
    );
  });
});
