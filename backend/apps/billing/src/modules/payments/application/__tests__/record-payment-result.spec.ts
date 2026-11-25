import { BillingErrorCode } from '@contracts/billing';
import { FixedClock, SequentialIdGenerator } from '@platform/kernel/test-utils';
import { TestTenantShard } from '../../../../__tests__/utils/test-tenant-shard.js';
import type { PaymentAttempt } from '../../domain/payment-attempt.js';
import { PaymentStatus } from '../../domain/payment-status.enum.js';
import { InMemoryPaymentAttempts } from '../../__tests__/utils/index.js';
import type { PaymentNotice } from '../payments.facade.js';
import { RecordPaymentResult } from '../record-payment-result.use-case.js';

const TENANT = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9a01';
const INVOICE = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9d01';
const REQUESTED_AT = new Date('2026-12-01T00:05:00.000Z');

class JobReservingFirstAttempts extends InMemoryPaymentAttempts {
  constructor(private readonly reservedByJob: PaymentAttempt) {
    super();
  }

  override async reserve(attempt: PaymentAttempt): Promise<boolean> {
    if (attempt.attempt === this.reservedByJob.attempt) {
      await super.reserve(this.reservedByJob);
    }
    return super.reserve(attempt);
  }
}

class NoticeHarness {
  constructor(
    readonly attempts: InMemoryPaymentAttempts = new InMemoryPaymentAttempts(),
  ) {}

  get record(): RecordPaymentResult {
    return new RecordPaymentResult(
      this.attempts,
      TestTenantShard.create(),
      new SequentialIdGenerator(),
      new FixedClock(REQUESTED_AT),
    );
  }

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

  approved(
    nextAttempt: number,
    reference: string,
    attemptId?: string,
  ): PaymentNotice {
    return {
      tenantId: TENANT,
      invoiceId: INVOICE,
      nextAttempt,
      result: { status: PaymentStatus.Approved, reference },
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

  it('refuses a notice that contradicts the result recorded for the attempt it names and leaves the retry in flight alone', async () => {
    const harness = new NoticeHarness();
    await harness.anAttempt(1, PaymentStatus.Declined, 'first');
    await harness.anAttempt(2, PaymentStatus.Requested, 'second');

    const notice = harness.record.execute(
      harness.approved(2, 'ref-of-first', 'first'),
    );

    await expect(notice).rejects.toMatchObject({
      code: BillingErrorCode.InvoiceInvalidState,
    });
    await expect(harness.attempts.findById(INVOICE, 'second')).resolves.toEqual(
      {
        id: 'second',
        invoiceId: INVOICE,
        attempt: 2,
        status: PaymentStatus.Requested,
        requestedAt: REQUESTED_AT,
      },
    );
    expect(harness.rows()).toEqual([
      { attempt: 1, status: PaymentStatus.Declined },
      { attempt: 2, status: PaymentStatus.Requested },
    ]);
  });

  it('refuses a notice without an attempt instead of resolving the attempt the job reserved meanwhile', async () => {
    const harness = new NoticeHarness(
      new JobReservingFirstAttempts({
        id: 'job',
        invoiceId: INVOICE,
        attempt: 2,
        status: PaymentStatus.Requested,
        requestedAt: REQUESTED_AT,
      }),
    );
    await harness.anAttempt(1, PaymentStatus.Declined);

    const notice = harness.record.execute(harness.approved(2, 'gateway-late'));

    await expect(notice).rejects.toMatchObject({
      code: BillingErrorCode.InvoiceInvalidState,
    });
    expect(harness.rows()).toEqual([
      { attempt: 1, status: PaymentStatus.Declined },
      { attempt: 2, status: PaymentStatus.Requested },
    ]);
  });

  it('answers with the attempt another copy of the same notice recorded meanwhile', async () => {
    const harness = new NoticeHarness(
      new JobReservingFirstAttempts({
        id: 'copy',
        invoiceId: INVOICE,
        attempt: 2,
        status: PaymentStatus.Approved,
        requestedAt: REQUESTED_AT,
        reference: 'gateway-late',
      }),
    );
    await harness.anAttempt(1, PaymentStatus.Declined);

    const attempt = await harness.record.execute(
      harness.approved(2, 'gateway-late'),
    );

    expect(attempt).toBe(2);
    expect(harness.rows()).toEqual([
      { attempt: 1, status: PaymentStatus.Declined },
      { attempt: 2, status: PaymentStatus.Approved },
    ]);
  });

  it('records a payment that arrives after a decline as the next attempt', async () => {
    const harness = new NoticeHarness();
    await harness.anAttempt(1, PaymentStatus.Declined);

    const attempt = await harness.record.execute(
      harness.approved(2, 'gateway-late'),
    );

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
