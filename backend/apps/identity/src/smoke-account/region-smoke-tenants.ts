import { Injectable } from '@nestjs/common';
import { SeedRegionTenants } from '../modules/tenants/index.js';
import { SmokeTenants } from './smoke-tenants.js';

/** `SmokeTenants` through the region seed of the tenants module. */
@Injectable()
export class RegionSmokeTenants extends SmokeTenants {
  constructor(private readonly region: SeedRegionTenants) {
    super();
  }

  /** {@inheritDoc SmokeTenants.place} */
  override place(tenantId: string): Promise<void> {
    return this.region.placeSmokeTenant(tenantId);
  }

  /** {@inheritDoc SmokeTenants.seed} */
  override seed(tenantId: string, ownerUserId: string): Promise<void> {
    return this.region.seedSmokeTenant(tenantId, ownerUserId);
  }
}
