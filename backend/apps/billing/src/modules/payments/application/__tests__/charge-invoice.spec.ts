import { Currency } from '@contracts/billing';
import { FixedClock, SequentialIdGenerator } from '@platform/kernel/test-utils';
import { TestTenantShard } from '../../../../__tests__/utils/test-tenant-shard.js';
import type { PaymentAttempts } from '../../domain/payment-attempts.js';
import { PaymentStatus } from '../../domain/payment-status.enum.js';
import {
  ApprovingPaymentProvider,
  CrashingAfterChargeAttempts,
  InMemoryPaymentAttempts,
} from '../../__tests__/utils/index.js';
import { ChargeInvoice } from '../charge-invoice.use-case.js';

const REQUEST = {
  tenantId: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9a01',
  invoiceId: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9d01',
  invoiceNumber: 'FAC-000001',
  attempt: 1,
  amountMinor: 189_000,
  currency: Currency.Cop,
};

class ChargeHarness {
  readonly clock = new FixedClock(new Date('2026-12-01T00:05:00.000Z'));
  readonly provider = new ApprovingPaymentProvider();
  private readonly ids = new SequentialIdGenerator();

  constructor(
    readonly attempts: PaymentAttempts = new InMemoryPaymentAttempts(),
  ) {}

  /** Una réplica del servicio: su propio caso de uso sobre la misma base y el mismo proveedor. */
  replica(): ChargeInvoice {
    return new ChargeInvoice(
      this.provider,
      this.attempts,
      TestTenantShard.create(),
      this.ids,
      this.clock,
    );
  }
}

describe('ChargeInvoice', () => {
  describe('when the process dies between charging and recording the answer', () => {
    it('asks the provider about the open attempt on the next run instead of charging again', async () => {
      const harness = new ChargeHarness(new CrashingAfterChargeAttempts());
      await expect(harness.replica().execute(REQUEST)).rejects.toThrow(
        'process died',
      );
      harness.clock.advance(ChargeInvoice.ABANDONED_AFTER_MS);

      const result = await harness.replica().execute(REQUEST);

      expect(result.status).toBe(PaymentStatus.Approved);
      expect(harness.provider.chargeCount()).toBe(1);
    });

    it('leaves an attempt that is still in flight to the run that asked for it', async () => {
      const harness = new ChargeHarness(new CrashingAfterChargeAttempts());
      await harness
        .replica()
        .execute(REQUEST)
        .catch(() => undefined);

      const result = await harness.replica().execute(REQUEST);

      expect(result).toEqual({ status: PaymentStatus.Requested });
      expect(harness.provider.chargeCount()).toBe(1);
    });
  });

  describe('when two replicas collect the same invoice at once', () => {
    it('charges it once: the second one does not get the attempt', async () => {
      const harness = new ChargeHarness();

      const results = await Promise.all([
        harness.replica().execute(REQUEST),
        harness.replica().execute(REQUEST),
      ]);

      expect(harness.provider.chargeCount()).toBe(1);
      expect(results.map((result) => result.status).sort()).toEqual([
        PaymentStatus.Approved,
        PaymentStatus.Requested,
      ]);
    });
  });

  it('answers a resolved attempt with its result without calling the provider', async () => {
    const harness = new ChargeHarness();
    await harness.replica().execute(REQUEST);

    const again = await harness.replica().execute(REQUEST);

    expect(again).toEqual({ status: PaymentStatus.Approved });
    expect(harness.provider.chargeCount()).toBe(1);
  });

  it('charges the next attempt of a declined invoice as a new charge', async () => {
    const harness = new ChargeHarness();
    await harness.replica().execute(REQUEST);

    await harness.replica().execute({ ...REQUEST, attempt: 2 });

    expect(harness.provider.chargeCount()).toBe(2);
  });

  it('charges an abandoned attempt the provider never received, with the same key', async () => {
    const attempts = new InMemoryPaymentAttempts();
    const harness = new ChargeHarness(attempts);
    await attempts.reserve({
      id: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9e09',
      invoiceId: REQUEST.invoiceId,
      attempt: 1,
      status: PaymentStatus.Requested,
      requestedAt: harness.clock.now(),
    });
    harness.clock.advance(ChargeInvoice.ABANDONED_AFTER_MS);

    const result = await harness.replica().execute(REQUEST);

    expect(result.status).toBe(PaymentStatus.Approved);
    expect(attempts.all()).toEqual([
      expect.objectContaining({
        id: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9e09',
        status: PaymentStatus.Approved,
      }),
    ]);
  });
});
