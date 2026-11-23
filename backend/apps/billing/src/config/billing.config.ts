import { z } from 'zod';
import { envNumber, serviceConfigSchema } from '@platform/config';
import { internalHttpConfigSchema } from '@platform/service';
import { BillingDefaults } from '../shared/constants/billing-defaults.constants.js';
import { FakePaymentOutcome } from '../shared/enums/fake-payment-outcome.enum.js';
import { PaymentProviderKind } from '../shared/enums/payment-provider-kind.enum.js';

/**
 * Configuración de billing. Los días de prueba y de gracia son obligatorios y sin valor por defecto: son una
 * decisión comercial de quien usa la plantilla (el entorno local usa 14 y 7).
 */
export const billingConfigSchema = serviceConfigSchema.extend({
  ...internalHttpConfigSchema.shape,
  BILLING_TRIAL_DAYS: envNumber({ min: 0 }),
  BILLING_GRACE_DAYS: envNumber({ min: 0 }),
  BILLING_INVOICE_SERIES: z
    .string()
    .regex(/^[A-Z0-9]{1,8}$/)
    .default(BillingDefaults.invoiceSeries),
  BILLING_TRIAL_PLAN: z.string().min(1).default(BillingDefaults.trialPlanCode),
  BILLING_PAYMENT_PROVIDER: z
    .enum(PaymentProviderKind)
    .default(PaymentProviderKind.Fake),
  BILLING_FAKE_PAYMENT_OUTCOME: z
    .enum(FakePaymentOutcome)
    .default(FakePaymentOutcome.Approved),
});

export type BillingConfig = z.output<typeof billingConfigSchema>;
