import { Controller, Get } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { BillingErrorCode, UsageMetric } from '@contracts/billing';
import type { ServiceAccountActor, UserActor } from '@platform/auth';
import { TestActors } from '@platform/auth/test-utils';
import { HttpRequestKey } from '@platform/http/nest';
import { InMemoryQuotaChecker } from '../../__tests__/utils/index.js';
import { Quota } from '../quota.decorator.js';
import { QuotaGuard } from '../quota.guard.js';

const TENANT = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9a01';

@Controller()
class IntegrationController {
  @Get('metered')
  @Quota(UsageMetric.ApiCalls)
  metered(): string {
    return 'ok';
  }

  @Get('free')
  free(): string {
    return 'ok';
  }
}

const serviceAccount = TestActors.serviceAccount(TENANT);
const user = TestActors.user(TENANT);

describe('QuotaGuard', () => {
  const quotas = new InMemoryQuotaChecker();
  quotas.set(TENANT, UsageMetric.ApiCalls, 10, 10);
  const guard = new QuotaGuard(new Reflector(), quotas);

  const contextFor = (
    handler: keyof IntegrationController,
    actor: ServiceAccountActor | UserActor,
  ) => ({
    getHandler: () => IntegrationController.prototype[handler],
    switchToHttp: () => ({
      getRequest: () => ({ [HttpRequestKey.Call]: { actor } }),
    }),
  });

  it('rejects a service account whose tenant used up the metric of the route', async () => {
    await expect(
      guard.canActivate(contextFor('metered', serviceAccount) as never),
    ).rejects.toMatchObject({ code: BillingErrorCode.QuotaExceeded });
  });

  it('lets a person through: only integration usage counts against the quota', async () => {
    await expect(
      guard.canActivate(contextFor('metered', user) as never),
    ).resolves.toBe(true);
  });

  it('lets through a route without a metric', async () => {
    await expect(
      guard.canActivate(contextFor('free', serviceAccount) as never),
    ).resolves.toBe(true);
  });
});
