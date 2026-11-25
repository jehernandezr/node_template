import { BillingErrorCode } from '@contracts/billing';
import { FixedClock, SequentialIdGenerator } from '@platform/kernel/test-utils';
import { TestTenantShard } from '../../../../__tests__/utils/test-tenant-shard.js';
import { PaymentStatus } from '../../domain/payment-status.enum.js';
import { InMemoryPaymentAttempts } from '../../__tests__/utils/index.js';
import type { PaymentNotice } from '../payments.facade.js';
import { RecordPaymentResult } from '../record-payment-result.use-case.js';

const TENANT = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9a01';
const INVOICE = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9d01';
const REQUESTED_AT = new Date('2026-12-01T00:05:00.000Z');

class NoticeHarness {
  readonly attempts = new InMemoryPaymentAttempts();
  readonly record = new RecordPaymentResult(
    this.attempts,
    TestTenantShard.create(),
    new SequentialIdGenerator(),
    new FixedClock(REQUESTED_AT),
  );

  async anAttempt(
    attempt: number,
    status: PaymentStatus,
    id = `attempt-${String(attempt)}`,
  ): Promise<void> {
    await this.attempts.reserve({
      id,
      invoiceId: INVOICE,
      attempt,
      status,
      requestedAt: REQUESTED_AT,
    });
  }

  declined(nextAttempt: number, attemptId?: string): PaymentNotice {
    return {
      tenantId: TENANT,
      invoiceId: INVOICE,
      nextAttempt,
      result: { status: PaymentStatus.Declined, reason: 'card_declined' },
      ...(attemptId === undefined ? {} : { attemptId }),
    };
  }

  rows(): readonly { attempt: number; status: PaymentStatus }[] {
    return this.attempts
      .all()
      .map(({ attempt, status }) => ({ attempt, status }))
      .sort((left, right) => left.attempt - right.attempt);
  }
}

describe('RecordPaymentResult', () => {
  it('records the same decline once when the provider reports it twice', async () => {
    const harness = new NoticeHarness();

    const first = await harness.record.execute(harness.declined(1));
    const again = await harness.record.execute(harness.declined(2));

    expect([first, again]).toEqual([1, 1]);
    expect(harness.rows()).toEqual([
      { attempt: 1, status: PaymentStatus.Declined },
    ]);
  });

  it('applies the webhook of a decline the job already recorded to that same attempt', async () => {
    const harness = new NoticeHarness();
    await harness.anAttempt(1, PaymentStatus.Declined);

    const attempt = await harness.record.execute(harness.declined(2));

    expect(attempt).toBe(1);
    expect(harness.rows()).toEqual([
      { attempt: 1, status: PaymentStatus.Declined },
    ]);
  });

  it('resolves the attempt still waiting for the provider', async () => {
    const harness = new NoticeHarness();
    await harness.anAttempt(1, PaymentStatus.Declined);
    await harness.anAttempt(2, PaymentStatus.Pending);

    const attempt = await harness.record.execute(harness.declined(2));

    expect(attempt).toBe(2);
    expect(harness.rows()).toEqual([
      { attempt: 1, status: PaymentStatus.Declined },
      { attempt: 2, status: PaymentStatus.Declined },
    ]);
  });

  it('applies a late notice to the attempt it names, not to the retry in flight', async () => {
    const harness = new NoticeHarness();
    await harness.anAttempt(1, PaymentStatus.Declined, 'first');
    await harness.anAttempt(2, PaymentStatus.Pending, 'second');

    const attempt = await harness.record.execute(harness.declined(2, 'first'));

    expect(attempt).toBe(1);
    expect(harness.rows()).toEqual([
      { attempt: 1, status: PaymentStatus.Declined },
      { attempt: 2, status: PaymentStatus.Pending },
    ]);
  });

  it('records a payment that arrives after a decline as the next attempt', async () => {
    const harness = new NoticeHarness();
    await harness.anAttempt(1, PaymentStatus.Declined);

    const attempt = await harness.record.execute({
      tenantId: TENANT,
      invoiceId: INVOICE,
      nextAttempt: 2,
      result: { status: PaymentStatus.Approved, reference: 'gateway-late' },
    });

    expect(attempt).toBe(2);
    expect(harness.rows()).toEqual([
      { attempt: 1, status: PaymentStatus.Declined },
      { attempt: 2, status: PaymentStatus.Approved },
    ]);
  });

  it('refuses a notice for an attempt that is not one of the invoice', async () => {
    const harness = new NoticeHarness();

    await expect(
      harness.record.execute(harness.declined(1, 'unknown')),
    ).rejects.toMatchObject({ code: BillingErrorCode.InvoiceNotFound });
    expect(harness.rows()).toEqual([]);
  });
});
