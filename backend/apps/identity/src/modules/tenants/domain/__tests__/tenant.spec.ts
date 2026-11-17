import { TenantKind, TenantLifecycle } from '@contracts/identity';
import { Tenant } from '../tenant.js';

function aTenant(): Tenant {
  return Tenant.provision({
    id: 't-1',
    slug: 'acme',
    name: 'Acme',
    region: 'eu',
    kind: TenantKind.Organization,
  });
}

describe('Tenant', () => {
  it('moves from provisioning to active, suspended and back', () => {
    const tenant = aTenant();

    expect(tenant.canBeDiscarded()).toBe(true);
    expect(tenant.activate()).toBe(true);
    expect(tenant.activate()).toBe(false);
    expect(tenant.suspend()).toBe(true);
    expect(tenant.suspend()).toBe(false);
    expect(tenant.isActive()).toBe(false);
    expect(tenant.reactivate()).toBe(true);
    expect(tenant.snapshot().status).toBe(TenantLifecycle.Active);
    expect(tenant.canBeDiscarded()).toBe(false);
  });
});
