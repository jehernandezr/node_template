import { z } from 'zod';
import { DeployEnvironment } from '../enums/deploy-environment.enum.js';
import { EnvironmentAllowance } from '../environment-allowance.js';

enum Sender {
  Fake = 'fake',
  Real = 'real',
  None = 'none',
}

const allowance = new EnvironmentAllowance<Sender>('SENDER', {
  [DeployEnvironment.Dev]: [Sender.Fake, Sender.None],
  [DeployEnvironment.Prod]: [Sender.None],
});

const schema = z
  .object({
    DEPLOY_ENVIRONMENT: z.enum(DeployEnvironment),
    SENDER: z.enum(Sender),
  })
  .superRefine((config, ctx) =>
    allowance.check(config.DEPLOY_ENVIRONMENT, config.SENDER, ctx),
  );

describe('EnvironmentAllowance', () => {
  it('accepts any value in an environment it does not list', () => {
    expect(allowance.allows(DeployEnvironment.Local, Sender.Fake)).toBe(true);
    expect(allowance.allows(DeployEnvironment.Staging, Sender.Real)).toBe(true);
  });

  it('accepts only the listed values in an environment it lists', () => {
    expect(allowance.allows(DeployEnvironment.Dev, Sender.Fake)).toBe(true);
    expect(allowance.allows(DeployEnvironment.Dev, Sender.Real)).toBe(false);
    expect(allowance.allows(DeployEnvironment.Prod, Sender.Fake)).toBe(false);
  });

  it('adds an issue on the variable that names the allowed values and not the received one', () => {
    const result = schema.safeParse({
      DEPLOY_ENVIRONMENT: DeployEnvironment.Dev,
      SENDER: Sender.Real,
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues).toEqual([
      expect.objectContaining({
        path: ['SENDER'],
        message: 'SENDER must be fake or none in dev',
      }),
    ]);
  });

  it('adds no issue for an allowed value', () => {
    expect(
      schema.safeParse({
        DEPLOY_ENVIRONMENT: DeployEnvironment.Prod,
        SENDER: Sender.None,
      }).success,
    ).toBe(true);
  });
});
