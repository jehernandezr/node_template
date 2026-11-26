import {
  BillingErrorCode,
  CheckQuotaOperation,
  UsageMetric,
  type CheckQuotaInput,
  type QuotaCheck as BillingQuotaCheck,
} from '@contracts/billing';
import { PlatformErrorCode } from '@contracts/platform';
import { OperationHandler, type HandlerResult } from '@platform/internal-api';
import { InProcessInternalApi } from '@platform/internal-api/test-utils';
import { FixedClock, SequentialIdGenerator } from '@platform/kernel/test-utils';
import { CallOutcome } from '@platform/primitives';
import { BillingQuotaChecker } from '../billing-quota-checker.js';
import { BillingUnavailableError } from '../billing-unavailable.error.js';

const TENANT = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9a01';
const UNSUBSCRIBED = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9a02';
const BROKEN = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9a03';
const OTHER = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9a04';
const THIRD = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9a05';

/** Fake billing: a limit of 100 calls and the usage the test sets. */
class QuotaLedger extends OperationHandler<typeof CheckQuotaOperation> {
  used = 0;
  answered = 0;
  suspended = false;

  override async handle(
    input: CheckQuotaInput,
  ): Promise<HandlerResult<BillingQuotaCheck>> {
    if (input.tenantId === UNSUBSCRIBED) {
      return {
        outcome: CallOutcome.businessError(
          BillingErrorCode.SubscriptionNotFound,
        ),
      };
    }
    if (input.tenantId === BROKEN) {
      return { outcome: CallOutcome.transientFailure('billing is down') };
    }
    this.answered += 1;
    return {
      outcome: CallOutcome.success({
        metric: input.metric,
        limit: 100,
        used: this.used,
        allowed: !this.suspended && this.used < 100,
      }),
    };
  }
}

const setup = (maxEntries?: number) => {
  const clock = new FixedClock(new Date('2026-11-20T10:00:00.000Z'));
  const ids = new SequentialIdGenerator();
  const api = new InProcessInternalApi({
    clock,
    ids,
    operations: [CheckQuotaOperation],
  });
  const billing = new QuotaLedger();
  api.router.register(CheckQuotaOperation, billing);
  return {
    billing,
    clock,
    quotas: new BillingQuotaChecker(
      api.client,
      ids,
      clock,
      BillingQuotaChecker.DEFAULT_TTL_MS,
      maxEntries,
    ),
  };
};

describe('BillingQuotaChecker', () => {
  it('refuses a suspended subscription even with room left in its limit', async () => {
    const { billing, quotas } = setup();
    billing.used = 10;
    billing.suspended = true;

    await expect(
      quotas.check(TENANT, UsageMetric.ApiCalls),
    ).resolves.toMatchObject({ allowed: false, used: 10, limit: 100 });
  });

  it('allows what still fits in the limit of the plan', async () => {
    const { billing, quotas } = setup();
    billing.used = 98;

    await expect(
      quotas.check(TENANT, UsageMetric.ApiCalls, 2),
    ).resolves.toEqual({
      metric: UsageMetric.ApiCalls,
      limit: 100,
      used: 98,
      allowed: true,
    });
  });

  it('rejects with BILLING.QUOTA.EXCEEDED and the usage what goes over the limit', async () => {
    const { billing, quotas } = setup();
    billing.used = 100;

    await expect(
      quotas.enforce(TENANT, UsageMetric.ApiCalls),
    ).rejects.toMatchObject({
      code: BillingErrorCode.QuotaExceeded,
      details: { metric: UsageMetric.ApiCalls, limit: 100, used: 100 },
    });
  });

  it('answers from what it kept for ten seconds and asks billing again after them', async () => {
    const { billing, clock, quotas } = setup();
    await quotas.check(TENANT, UsageMetric.ApiCalls);
    billing.used = 100;

    const kept = await quotas.check(TENANT, UsageMetric.ApiCalls);
    clock.advance(BillingQuotaChecker.DEFAULT_TTL_MS);
    const fresh = await quotas.check(TENANT, UsageMetric.ApiCalls);

    expect(kept.allowed).toBe(true);
    expect(fresh.allowed).toBe(false);
    expect(billing.answered).toBe(2);
  });

  it('forgets the oldest tenant when it keeps as many as it may', async () => {
    const { billing, quotas } = setup(2);
    await quotas.check(TENANT, UsageMetric.ApiCalls);
    await quotas.check(OTHER, UsageMetric.ApiCalls);
    await quotas.check(THIRD, UsageMetric.ApiCalls);

    await quotas.check(THIRD, UsageMetric.ApiCalls);
    const beforeOldest = billing.answered;
    await quotas.check(TENANT, UsageMetric.ApiCalls);

    expect(beforeOldest).toBe(3);
    expect(billing.answered).toBe(4);
  });

  it('lets a tenant without a subscription through', async () => {
    const { quotas } = setup();

    await expect(
      quotas.enforce(UNSUBSCRIBED, UsageMetric.Users),
    ).resolves.toBeUndefined();
  });

  it('fails with a retryable error when billing does not answer', async () => {
    const { quotas } = setup();

    await expect(
      quotas.check(BROKEN, UsageMetric.ApiCalls),
    ).rejects.toBeInstanceOf(BillingUnavailableError);
    await expect(
      quotas.check(BROKEN, UsageMetric.ApiCalls),
    ).rejects.toMatchObject({
      code: PlatformErrorCode.ResilienceCircuitOpen,
      retryable: true,
    });
  });
});
