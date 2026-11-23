import { PlanFeature, TenantKind, TenantLifecycle } from '@contracts/identity';
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

  describe('plan features', () => {
    const EARLIER = new Date('2026-11-20T10:00:00.000Z');
    const LATER = new Date('2026-11-20T11:00:00.000Z');

    it('keeps the later plan when an earlier change arrives after it', () => {
      const tenant = aTenant();

      expect(tenant.applyPlan([PlanFeature.AdvancedReports], LATER)).toBe(true);
      expect(tenant.applyPlan([PlanFeature.Billing], EARLIER)).toBe(false);
      expect(tenant.snapshot().planFeatures).toEqual([
        PlanFeature.AdvancedReports,
      ]);
    });

    it('applies the same change again so a retry finishes its effects', () => {
      const tenant = aTenant();
      tenant.applyPlan([PlanFeature.Billing], LATER);

      expect(tenant.applyPlan([PlanFeature.Billing], LATER)).toBe(true);
    });
  });
});
