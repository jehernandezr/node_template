import {
  FeatureFlag,
  PlanFeature,
  Permission,
  PlatformRole,
  type UserAccess,
} from '@contracts/identity';
import { InMemoryAccessFacade } from './utils/index.js';

const ANA = {
  userId: '018f0000-0000-7000-8000-000000000001',
  homeTenantId: 'tenant-a',
};
const ACCESS: UserAccess = {
  permissions: [Permission.TasksRead],
  roles: ['member'],
  permissionVersion: '1.2',
  platformRoles: [PlatformRole.Support],
  features: [PlanFeature.Billing],
  flags: [FeatureFlag.NewReports],
};

describe('InMemoryAccessFacade', () => {
  it('resolves the seeded access of the user in the tenant', async () => {
    const facade = new InMemoryAccessFacade().setAccess(
      ANA.userId,
      'tenant-a',
      ACCESS,
    );

    await expect(facade.resolve(ANA.userId, 'tenant-a')).resolves.toEqual(
      ACCESS,
    );
  });

  it('rejects resolve without a seeded access', async () => {
    await expect(
      new InMemoryAccessFacade().resolve(ANA.userId, 'tenant-a'),
    ).rejects.toThrow('Access not found');
  });

  it('answers membership from the seeded memberships and from added members', async () => {
    const facade = new InMemoryAccessFacade().addMembership(
      ANA.userId,
      'tenant-a',
    );

    await expect(facade.isMember(ANA.userId, 'tenant-a')).resolves.toBe(true);
    await expect(facade.isMember(ANA.userId, 'tenant-b')).resolves.toBe(false);

    await facade.addMember('tenant-b', ANA, ['grupo-1']);

    await expect(facade.isMember(ANA.userId, 'tenant-b')).resolves.toBe(true);
    expect(facade.added).toEqual([
      { tenantId: 'tenant-b', ref: ANA, groupIds: ['grupo-1'] },
    ]);
  });

  it('returns the default tenant and rejects a user without one', async () => {
    const facade = new InMemoryAccessFacade().setDefaultTenant(
      ANA.userId,
      'tenant-a',
    );

    await expect(facade.defaultTenant(ANA)).resolves.toBe('tenant-a');
    await expect(
      facade.defaultTenant({ userId: 'otro', homeTenantId: 'tenant-a' }),
    ).rejects.toThrow('Default tenant not found');
  });

  it('reports the MFA requirement only where it was set', async () => {
    const facade = new InMemoryAccessFacade().requireMfaOnEveryLogin(
      ANA.userId,
      'tenant-a',
    );

    await expect(facade.requiresMfaOnEveryLogin(ANA, 'tenant-a')).resolves.toBe(
      true,
    );
    await expect(facade.requiresMfaOnEveryLogin(ANA, 'tenant-b')).resolves.toBe(
      false,
    );
  });
});
