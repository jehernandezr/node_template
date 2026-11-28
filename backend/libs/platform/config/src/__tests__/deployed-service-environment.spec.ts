import { DeployEnvironment } from '../enums/deploy-environment.enum.js';
import { DeployedServiceEnvironment } from './utils/index.js';

describe('DeployedServiceEnvironment', () => {
  it('reads the environment variables of a service with the environment and service name the stack adds', () => {
    const environment = DeployedServiceEnvironment.of(
      'billing',
      DeployEnvironment.Prod,
      {},
    );

    expect(environment).toMatchObject({
      DEPLOY_ENVIRONMENT: DeployEnvironment.Prod,
      SERVICE_NAME: 'billing',
      BILLING_TRIAL_DAYS: '14',
    });
  });

  it('covers every deployed environment and no local one', () => {
    expect(DeployedServiceEnvironment.ENVIRONMENTS).toEqual([
      DeployEnvironment.Dev,
      DeployEnvironment.Staging,
      DeployEnvironment.Prod,
    ]);
  });

  it('fails for a service without values', () => {
    expect(() =>
      DeployedServiceEnvironment.of('nowhere', DeployEnvironment.Dev, {}),
    ).toThrow();
  });

  describe('secrets', () => {
    const values = [
      'service_name = "sample"',
      'environment_variables = {',
      '  SAMPLE_MODE = "on"',
      '}',
      'secrets = {',
      '  # Delivered from Secrets Manager.',
      '  SAMPLE_KEY = "arn:aws:secretsmanager:us-east-1:000000000000:secret:sample"',
      '}',
    ].join('\n');

    it('gives each secret the sample value of the test', () => {
      expect(
        DeployedServiceEnvironment.parse(values, DeployEnvironment.Staging, {
          SAMPLE_KEY: 'sample-value',
        }),
      ).toEqual({
        SAMPLE_MODE: 'on',
        SAMPLE_KEY: 'sample-value',
        DEPLOY_ENVIRONMENT: DeployEnvironment.Staging,
        SERVICE_NAME: 'sample',
      });
    });

    it('fails for a secret the test gives no sample value', () => {
      expect(() =>
        DeployedServiceEnvironment.parse(values, DeployEnvironment.Staging, {}),
      ).toThrow('SAMPLE_KEY');
    });

    it('reads an empty secrets map as no secrets', () => {
      expect(
        DeployedServiceEnvironment.parse(
          'service_name = "sample"\nsecrets = {}\n',
          DeployEnvironment.Dev,
          {},
        ),
      ).toEqual({
        DEPLOY_ENVIRONMENT: DeployEnvironment.Dev,
        SERVICE_NAME: 'sample',
      });
    });
  });
});
