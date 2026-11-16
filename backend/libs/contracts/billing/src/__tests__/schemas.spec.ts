import { validateContract } from '@contracts/platform';
import type { z } from 'zod';
import { billingContract } from '../contract.js';
import {
  BillingLimits,
  UsageAggregation,
} from '../constants/billing.constants.js';
import {
  Currency,
  InvoiceLineKind,
  InvoiceStatus,
  PlanPeriodicity,
  SubscriptionStatus,
  UsageAggregationKind,
  UsageMetric,
} from '../enums/billing.enum.js';
import { Ids, Invoice, Plan, Price, Period } from './utils/fixtures.js';

const schemas = billingContract.schemas as Record<string, z.ZodType>;

describe('billing enums and aggregation', () => {
  it('keeps the enum values of the contract', () => {
    expect(Object.values(InvoiceStatus)).toEqual([
      'draft',
      'issued',
      'paid',
      'failed',
      'void',
    ]);
    expect(InvoiceStatus.Void).toBe('void');
    expect(Object.values(Currency)).toEqual(['COP', 'USD']);
    expect(Object.values(UsageMetric)).toEqual([
      'users',
      'api_calls',
      'storage_gb',
    ]);
    expect(Object.values(SubscriptionStatus)).toEqual([
      'trialing',
      'active',
      'past_due',
      'suspended',
      'canceled',
    ]);
    expect(Object.values(InvoiceLineKind)).toEqual(['fixed_fee', 'usage']);
    expect(Object.values(PlanPeriodicity)).toEqual(['monthly', 'annual']);
  });

  it('aggregates users and storage by maximum and api calls by sum', () => {
    expect(UsageAggregation).toEqual({
      users: UsageAggregationKind.Max,
      apiCalls: UsageAggregationKind.Sum,
      storageGb: UsageAggregationKind.Max,
    });
  });
});

describe('billing limits in the schemas', () => {
  it('bounds the name of a plan', () => {
    expect(
      validateContract(schemas.Plan, {
        ...Plan,
        name: 'a'.repeat(BillingLimits.planNameMaxLength + 1),
      }).ok,
    ).toBe(false);
    expect(
      validateContract(schemas.Plan, {
        ...Plan,
        name: 'a'.repeat(BillingLimits.planNameMaxLength),
      }).ok,
    ).toBe(true);
  });

  it('caps the quotas and the features of a plan', () => {
    const quota = { metric: UsageMetric.Users, limit: 1 };
    expect(
      validateContract(schemas.Plan, {
        ...Plan,
        quotas: Array.from(
          { length: BillingLimits.maxQuotasPerPlan + 1 },
          () => quota,
        ),
      }).ok,
    ).toBe(false);
    expect(
      validateContract(schemas.Plan, {
        ...Plan,
        features: Array.from(
          { length: BillingLimits.maxFeaturesPerPlan + 1 },
          () => Plan.features[0],
        ),
      }).ok,
    ).toBe(false);
  });

  it('caps the lines of an invoice', () => {
    const line = Invoice.lines[0];
    expect(
      validateContract(schemas.Invoice, {
        ...Invoice,
        lines: Array.from(
          { length: BillingLimits.maxLinesPerInvoice + 1 },
          () => line,
        ),
      }).ok,
    ).toBe(false);
  });

  it('bounds the number of an invoice', () => {
    expect(
      validateContract(schemas.Invoice, {
        ...Invoice,
        number: 'a'.repeat(BillingLimits.invoiceNumberMaxLength + 1),
      }).ok,
    ).toBe(false);
  });

  it('caps the invoice pages at one hundred items', () => {
    const summary = {
      id: Ids.item,
      number: Invoice.number,
      period: Period,
      status: InvoiceStatus.Issued,
      currency: Currency.Usd,
      total: Price,
    };
    const items = Array.from({ length: 101 }, () => summary);
    expect(
      validateContract(schemas.InvoicePage, { items, nextCursor: null }).ok,
    ).toBe(false);
    expect(
      validateContract(schemas.InvoicePage, {
        items: items.slice(0, 100),
        nextCursor: null,
      }).ok,
    ).toBe(true);
  });

  it('bounds the reason of a failed invoice and the payment reference', () => {
    const failed = {
      tenantId: Ids.tenant,
      invoiceId: Ids.item,
      failedAt: '2026-11-13T12:00:00.000Z',
    };
    expect(
      validateContract(schemas.MarkInvoiceFailedInput, {
        ...failed,
        reason: 'a'.repeat(BillingLimits.failureReasonMaxLength + 1),
      }).ok,
    ).toBe(false);
    expect(
      validateContract(schemas.MarkInvoicePaidInput, {
        tenantId: Ids.tenant,
        invoiceId: Ids.item,
        paidAt: '2026-11-13T12:00:00.000Z',
        reference: 'a'.repeat(BillingLimits.paymentReferenceMaxLength + 1),
      }).ok,
    ).toBe(false);
  });

  it('bounds the quantity of a quota check', () => {
    const check = {
      tenantId: Ids.tenant,
      metric: UsageMetric.ApiCalls,
    };
    expect(
      validateContract(schemas.CheckQuotaInput, {
        ...check,
        requested: BillingLimits.maxUsageQuantity + 1,
      }).ok,
    ).toBe(false);
    expect(validateContract(schemas.CheckQuotaInput, check).ok).toBe(true);
  });
});
