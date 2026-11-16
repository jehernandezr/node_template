import { TenantStatus } from '../../model/tenant-status.enum.js';
import type { TenantPlacement } from '../../model/tenant-placement.js';
import { TestTenants } from './test-tenants.js';

/** Arma un `TenantPlacement` válido; cada prueba cambia solo lo que le importa. */
export class PlacementBuilder {
  private placement: TenantPlacement = {
    tenantId: TestTenants.One,
    region: 'eu',
    shardGroup: ['shard-1'],
    status: TenantStatus.Active,
    version: 1,
    dedicated: false,
  };

  static aPlacement(): PlacementBuilder {
    return new PlacementBuilder();
  }

  withTenantId(tenantId: string): this {
    this.placement = { ...this.placement, tenantId };
    return this;
  }

  withRegion(region: string): this {
    this.placement = { ...this.placement, region };
    return this;
  }

  withShardGroup(...shardGroup: string[]): this {
    this.placement = { ...this.placement, shardGroup };
    return this;
  }

  withStatus(status: TenantStatus): this {
    this.placement = { ...this.placement, status };
    return this;
  }

  withVersion(version: number): this {
    this.placement = { ...this.placement, version };
    return this;
  }

  dedicated(): this {
    this.placement = { ...this.placement, dedicated: true };
    return this;
  }

  build(): TenantPlacement {
    return this.placement;
  }
}
