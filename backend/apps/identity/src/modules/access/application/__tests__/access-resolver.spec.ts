import { FeatureFlag, TenantKind, TenantLifecycle } from '@contracts/identity';
import { FlagEvaluator, InMemoryFlagStore } from '@platform/flags';
import { TestShardScopes } from '../../../../__tests__/utils/index.js';
import {
  InMemoryTenantsFacade,
  PlanEntitlementsProvider,
} from '../../../tenants/__tests__/utils/index.js';
import {
  InMemoryTenantAccessRepository,
  InMemoryUserAccessRepository,
} from '../../__tests__/utils/index.js';
import { AccessResolver } from '../access-resolver.js';

const TENANT = 'tenant-acme';
const USER = 'user-ana';

describe('AccessResolver', () => {
  const flags = new InMemoryFlagStore();
  const tenantAccess = new InMemoryTenantAccessRepository();
  const resolver = new AccessResolver(
    tenantAccess,
    new InMemoryUserAccessRepository(),
    new InMemoryTenantsFacade().add({
      id: TENANT,
      slug: 'acme',
      name: 'Acme',
      region: 'eu',
      kind: TenantKind.Organization,
      status: TenantLifecycle.Active,
    }),
    new PlanEntitlementsProvider(),
    TestShardScopes.create(),
    new FlagEvaluator(flags),
  );

  beforeAll(async () => {
    await tenantAccess.insertMembership({
      id: 'membership-ana',
      tenantId: TENANT,
      userId: USER,
      homeTenantId: TENANT,
      groupIds: [],
      permissionVersion: 1,
      joinedAt: new Date('2026-01-01T00:00:00.000Z'),
      leavingSince: null,
    });
  });

  describe('feature flags in the access grant', () => {
    it('grants the flag a rule turns on for the tenant plan', async () => {
      flags.put({
        flag: FeatureFlag.NewReports,
        enabled: true,
        rolloutPercent: 0,
        plans: [TenantKind.Organization],
      });

      const access = await resolver.resolve(USER, TENANT);

      expect(access.flags).toEqual([FeatureFlag.NewReports]);
    });

    it('leaves out a flag that is off and rules for flags the contract does not know', async () => {
      flags.put({
        flag: FeatureFlag.NewReports,
        enabled: false,
        rolloutPercent: 100,
      });
      flags.put({ flag: 'unknown_flag', enabled: true, rolloutPercent: 100 });

      const access = await resolver.resolve(USER, TENANT);

      expect(access.flags).toEqual([]);
    });
  });
});
