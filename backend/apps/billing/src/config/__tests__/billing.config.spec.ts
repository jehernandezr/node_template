import { randomBytes } from 'node:crypto';
import { DeployEnvironment, type ConfigEnv } from '@platform/config';
import { PaymentProviderKind } from '../../shared/enums/payment-provider-kind.enum.js';
import { billingConfigSchema } from '../billing.config.js';

const environment = (values: ConfigEnv): ConfigEnv => ({
  SERVICE_NAME: 'billing',
  BILLING_TRIAL_DAYS: '14',
  BILLING_GRACE_DAYS: '7',
  INTERNAL_API_SHARED_SECRET: randomBytes(32).toString('base64url'),
  ...values,
});

const issues = (values: ConfigEnv): string[] => {
  const result = billingConfigSchema.safeParse(environment(values));
  return result.success
    ? []
    : result.error.issues.map((issue) => String(issue.path[0]));
};

describe('billingConfigSchema', () => {
  it('uses the fake provider locally by default', () => {
    expect(
      billingConfigSchema.parse(environment({})).BILLING_PAYMENT_PROVIDER,
    ).toBe(PaymentProviderKind.Fake);
  });

  it.each([PaymentProviderKind.Fake, PaymentProviderKind.None])(
    'accepts the %s provider in dev',
    (provider) => {
      expect(
        issues({
          DEPLOY_ENVIRONMENT: DeployEnvironment.Dev,
          BILLING_PAYMENT_PROVIDER: provider,
        }),
      ).toEqual([]);
    },
  );

  it.each([DeployEnvironment.Staging, DeployEnvironment.Prod])(
    'accepts only the none provider in %s',
    (deployEnvironment) => {
      expect(
        issues({
          DEPLOY_ENVIRONMENT: deployEnvironment,
          BILLING_PAYMENT_PROVIDER: PaymentProviderKind.Fake,
        }),
      ).toEqual(['BILLING_PAYMENT_PROVIDER']);
      expect(issues({ DEPLOY_ENVIRONMENT: deployEnvironment })).toEqual([
        'BILLING_PAYMENT_PROVIDER',
      ]);
      expect(
        issues({
          DEPLOY_ENVIRONMENT: deployEnvironment,
          BILLING_PAYMENT_PROVIDER: PaymentProviderKind.None,
        }),
      ).toEqual([]);
    },
  );
});
