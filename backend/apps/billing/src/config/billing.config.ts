import { z } from 'zod';
import {
  DeployEnvironment,
  EnvironmentAllowance,
  envNumber,
  serviceConfigSchema,
} from '@platform/config';
import { internalHttpConfigSchema } from '@platform/service';
import { BillingDefaults } from '../shared/constants/billing-defaults.constants.js';
import { FakePaymentOutcome } from '../shared/enums/fake-payment-outcome.enum.js';
import { PaymentProviderKind } from '../shared/enums/payment-provider-kind.enum.js';

/** `dev` may still use the fake provider; `staging` and `prod` never charge until a real provider lands (ADR 0046). */
const PAYMENT_PROVIDER = new EnvironmentAllowance<PaymentProviderKind>(
  'BILLING_PAYMENT_PROVIDER',
  {
    [DeployEnvironment.Dev]: [
      PaymentProviderKind.Fake,
      PaymentProviderKind.None,
    ],
    [DeployEnvironment.Staging]: [PaymentProviderKind.None],
    [DeployEnvironment.Prod]: [PaymentProviderKind.None],
  },
);

/**
 * Billing configuration. Trial and grace days are required and have no default: they are a
 * business decision of whoever uses the template (the local environment uses 14 and 7).
 */
export const billingConfigSchema = serviceConfigSchema
  .extend({
    ...internalHttpConfigSchema.shape,
    BILLING_TRIAL_DAYS: envNumber({ min: 0 }),
    BILLING_GRACE_DAYS: envNumber({ min: 0 }),
    BILLING_INVOICE_SERIES: z
      .string()
      .regex(/^[A-Z0-9]{1,8}$/)
      .default(BillingDefaults.invoiceSeries),
    BILLING_TRIAL_PLAN: z
      .string()
      .min(1)
      .default(BillingDefaults.trialPlanCode),
    BILLING_PAYMENT_PROVIDER: z
      .enum(PaymentProviderKind)
      .default(PaymentProviderKind.Fake),
    BILLING_FAKE_PAYMENT_OUTCOME: z
      .enum(FakePaymentOutcome)
      .default(FakePaymentOutcome.Approved),
  })
  .superRefine((config, ctx) =>
    PAYMENT_PROVIDER.check(
      config.DEPLOY_ENVIRONMENT,
      config.BILLING_PAYMENT_PROVIDER,
      ctx,
    ),
  );

export type BillingConfig = z.output<typeof billingConfigSchema>;
