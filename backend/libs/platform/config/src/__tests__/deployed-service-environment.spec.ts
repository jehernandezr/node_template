import { DeployEnvironment } from '../enums/deploy-environment.enum.js';
import { DeployedServiceEnvironment } from './utils/index.js';

describe('DeployedServiceEnvironment', () => {
  it('reads the environment variables of a service with the environment and service name the stack adds', () => {
    const environment = DeployedServiceEnvironment.of(
      'billing',
      DeployEnvironment.Prod,
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
      DeployedServiceEnvironment.of('nowhere', DeployEnvironment.Dev),
    ).toThrow();
  });
});
