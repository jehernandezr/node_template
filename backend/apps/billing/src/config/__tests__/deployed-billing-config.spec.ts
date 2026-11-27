import { randomBytes } from 'node:crypto';
import { DeployEnvironment, type ConfigEnv } from '@platform/config';
import { DeployedServiceEnvironment } from '@platform/config/test-utils';
import { PaymentProviderKind } from '../../shared/enums/payment-provider-kind.enum.js';
import { billingConfigSchema } from '../billing.config.js';

const samples: ConfigEnv = {
  INTERNAL_API_SHARED_SECRET: randomBytes(32).toString('base64url'),
};

const deployed = (environment: DeployEnvironment): ConfigEnv => ({
  ...samples,
  ...DeployedServiceEnvironment.of('billing', environment, samples),
});

describe.each(DeployedServiceEnvironment.ENVIRONMENTS)(
  'billing with its %s values',
  (environment) => {
    it('starts', () => {
      expect(
        billingConfigSchema.safeParse(deployed(environment)).error,
      ).toBeUndefined();
    });
  },
);

describe.each([DeployEnvironment.Staging, DeployEnvironment.Prod])(
  'billing with its %s values',
  (environment) => {
    it('never charges', () => {
      expect(
        billingConfigSchema.parse(deployed(environment))
          .BILLING_PAYMENT_PROVIDER,
      ).toBe(PaymentProviderKind.None);
    });

    it('rejects the fake provider', () => {
      expect(
        billingConfigSchema.safeParse({
          ...deployed(environment),
          BILLING_PAYMENT_PROVIDER: PaymentProviderKind.Fake,
        }).success,
      ).toBe(false);
    });
  },
);
