import { Compensation, validateContract } from '@contracts/platform';
import { billingContract } from '../contract.js';
import { BillingOperation } from '../enums/identifiers.enum.js';
import { Currency, InvoiceStatus, UsageMetric } from '../enums/billing.enum.js';
import { Ids, Now, UuidV4 } from './utils/fixtures.js';

const operations = Object.values(billingContract.operations);

describe('billing internal operations', () => {
  it('uses every BillingOperation value exactly once', () => {
    const ids = operations.map((op) => op.id);
    expect([...ids].sort()).toEqual(Object.values(BillingOperation).sort());
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(operations.map((op) => [op.id, op] as const))(
    'makes %s idempotent',
    (_id, op) => {
      expect(op.idempotent).toBe(true);
    },
  );

  it('keeps the reads free of compensation', () => {
    for (const op of [
      billingContract.operations.getEntitlements,
      billingContract.operations.checkQuota,
      billingContract.operations.listInvoiceChanges,
    ]) {
      expect(op.mutating).toBe(false);
      expect(op.compensatedBy).toBeUndefined();
    }
  });

  it('compensates the account opening with its close', () => {
    expect(billingContract.operations.openAccount.compensatedBy).toBe(
      BillingOperation.CloseAccount,
    );
  });

  it.each([
    ['closeAccount'],
    ['markInvoicePaid'],
    ['markInvoiceFailed'],
  ] as const)('leaves %s without compensation and with a reason', (name) => {
    const op = billingContract.operations[name];
    expect(op.compensatedBy).toBe(Compensation.None);
    expect(op.compensationReason?.trim().length).toBeGreaterThan(0);
  });

  it('compensates the sync and the finalize of a move with the abort', () => {
    expect(billingContract.operations.tenantMoveSync.compensatedBy).toBe(
      BillingOperation.TenantMoveAbort,
    );
    expect(billingContract.operations.tenantMoveFinalize.compensatedBy).toBe(
      BillingOperation.TenantMoveAbort,
    );
  });

  it('rejects a quota check that requests nothing', () => {
    const { input } = billingContract.operations.checkQuota;
    expect(
      validateContract(input, {
        tenantId: Ids.tenant,
        metric: UsageMetric.ApiCalls,
        requested: 0,
      }).ok,
    ).toBe(false);
    expect(
      validateContract(input, {
        tenantId: Ids.tenant,
        metric: UsageMetric.ApiCalls,
        requested: 3,
      }).ok,
    ).toBe(true);
  });

  it('validates the input of the invoice payment', () => {
    const { input } = billingContract.operations.markInvoicePaid;
    const valid = {
      tenantId: Ids.tenant,
      invoiceId: Ids.item,
      paidAt: Now,
      reference: 'pago-2026-11-13',
      amount: { amountMinor: 189_000, currency: 'COP' },
    };
    expect(validateContract(input, valid).ok).toBe(true);
    expect(validateContract(input, { ...valid, reference: '' }).ok).toBe(false);
    expect(validateContract(input, { ...valid, paidAt: 'ayer' }).ok).toBe(
      false,
    );
    expect(validateContract(input, { ...valid, tenantId: UuidV4 }).ok).toBe(
      false,
    );
  });

  it('validates the input of the invoice failure with an optional reason', () => {
    const { input } = billingContract.operations.markInvoiceFailed;
    const valid = {
      tenantId: Ids.tenant,
      invoiceId: Ids.item,
      failedAt: Now,
    };
    expect(validateContract(input, valid).ok).toBe(true);
    expect(
      validateContract(input, { ...valid, reason: 'Tarjeta rechazada' }).ok,
    ).toBe(true);
    expect(validateContract(input, { ...valid, reason: '' }).ok).toBe(false);
  });

  it('pages the invoices of a tenant with their issue and payment dates', () => {
    const { input, output } = billingContract.operations.listInvoiceChanges;
    const invoice = {
      id: Ids.item,
      number: 'FAC-000001',
      period: { start: '2026-10-01', end: '2026-10-31' },
      status: InvoiceStatus.Paid,
      currency: Currency.Cop,
      total: { amountMinor: 49_900, currency: Currency.Cop },
      issuedAt: Now,
      paidAt: Now,
    };
    expect(
      validateContract(input, { tenantId: Ids.tenant, limit: 50 }).ok,
    ).toBe(true);
    expect(validateContract(input, { tenantId: UuidV4 }).ok).toBe(false);
    expect(
      validateContract(output, { items: [invoice], nextCursor: null }).ok,
    ).toBe(true);
    expect(
      validateContract(output, {
        items: [{ ...invoice, paidAt: undefined }],
        nextCursor: null,
      }).ok,
    ).toBe(false);
  });

  it('validates the input of the account opening', () => {
    const { input } = billingContract.operations.openAccount;
    expect(
      validateContract(input, {
        tenantId: Ids.tenant,
        ownerUserId: Ids.user,
      }).ok,
    ).toBe(true);
    expect(
      validateContract(input, {
        tenantId: UuidV4,
        ownerUserId: Ids.user,
      }).ok,
    ).toBe(false);
  });
});
