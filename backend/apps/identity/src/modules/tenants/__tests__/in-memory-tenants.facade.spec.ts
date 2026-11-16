import { TenantKind, TenantLifecycle } from '@contracts/identity';
import { InMemoryTenantsFacade } from './utils/index.js';

const ACME = {
  id: '018f0000-0000-7000-8000-0000000000a1',
  slug: 'acme',
  name: 'Acme',
  region: 'eu',
  kind: TenantKind.Organization,
  status: TenantLifecycle.Active,
};

describe('InMemoryTenantsFacade', () => {
  it('returns a seeded tenant', async () => {
    const facade = new InMemoryTenantsFacade().add(ACME);

    await expect(facade.get(ACME.id)).resolves.toEqual(ACME);
  });

  it('rejects a tenant that does not exist', async () => {
    await expect(new InMemoryTenantsFacade().get('x')).rejects.toThrow(
      'Tenant not found',
    );
  });

  it('accepts an active tenant', async () => {
    await expect(
      new InMemoryTenantsFacade().add(ACME).assertActive(ACME.id),
    ).resolves.toBeUndefined();
  });

  it('rejects a suspended tenant', async () => {
    const facade = new InMemoryTenantsFacade().add({
      ...ACME,
      status: TenantLifecycle.Suspended,
    });

    await expect(facade.assertActive(ACME.id)).rejects.toThrow(
      'Tenant not active',
    );
  });

  it('rejects assertActive for a tenant that does not exist', async () => {
    await expect(new InMemoryTenantsFacade().assertActive('x')).rejects.toThrow(
      'Tenant not found',
    );
  });
});
