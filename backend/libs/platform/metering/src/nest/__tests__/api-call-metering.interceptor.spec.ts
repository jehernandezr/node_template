import { UsageMetric } from '@contracts/billing';
import type { ServiceAccountActor, UserActor } from '@platform/auth';
import { TestActors } from '@platform/auth/test-utils';
import { HttpRequestKey } from '@platform/http/nest';
import { FixedClock } from '@platform/kernel/test-utils';
import { SilentLogger } from '@platform/messaging/test-utils';
import { lastValueFrom, of } from 'rxjs';
import { BufferedUsageRecorder } from '../../buffered-usage-recorder.js';
import { InMemoryUsageCounterStore } from '../../in-memory-usage-counter-store.js';
import { UsageCounterStore } from '../../usage-counter-store.js';
import { UsageWindowClock } from '../../usage-window-clock.js';
import { ApiCallMeteringInterceptor } from '../api-call-metering.interceptor.js';

const TENANT = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9a01';
const serviceAccount = TestActors.serviceAccount(TENANT);
const user = TestActors.user(TENANT);

class UnreachableCounters extends InMemoryUsageCounterStore {
  override async add(): Promise<void> {
    throw new Error('valkey unreachable');
  }
}

const contextOf = (actor: ServiceAccountActor | UserActor) => ({
  switchToHttp: () => ({
    getRequest: () => ({ [HttpRequestKey.Call]: { actor } }),
  }),
});

const setup = (
  counters: UsageCounterStore = new InMemoryUsageCounterStore(),
) => {
  const clock = new FixedClock(new Date('2026-11-20T10:00:30.000Z'));
  return {
    counters,
    clock,
    interceptor: new ApiCallMeteringInterceptor(
      new BufferedUsageRecorder(counters, new UsageWindowClock(clock)),
      new SilentLogger(),
    ),
  };
};

describe('ApiCallMeteringInterceptor', () => {
  it('counts one api call for each request of a service account', async () => {
    const { clock, counters, interceptor } = setup();

    await lastValueFrom(
      interceptor.intercept(contextOf(serviceAccount) as never, {
        handle: () => of('done'),
      }),
    );

    await expect(
      counters.pending(new Date(clock.now().getTime() + 60_000)),
    ).resolves.toEqual([
      {
        start: new Date('2026-11-20T10:00:00.000Z'),
        counts: [
          { tenantId: TENANT, metric: UsageMetric.ApiCalls, quantity: 1 },
        ],
      },
    ]);
  });

  it('does not count the requests of a person', async () => {
    const { clock, counters, interceptor } = setup();

    await lastValueFrom(
      interceptor.intercept(contextOf(user) as never, {
        handle: () => of('done'),
      }),
    );

    await expect(
      counters.pending(new Date(clock.now().getTime() + 60_000)),
    ).resolves.toEqual([]);
  });

  it('answers the request even when the counters cannot be reached', async () => {
    const { interceptor } = setup(new UnreachableCounters());

    await expect(
      lastValueFrom(
        interceptor.intercept(contextOf(serviceAccount) as never, {
          handle: () => of('done'),
        }),
      ),
    ).resolves.toBe('done');
  });
});
