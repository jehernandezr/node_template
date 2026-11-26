import { TenantVerifier } from '@platform/messaging';

/** Tenant verifier of a region with a fixed set of placed tenants, like `PlacedTenantVerifier` without a directory. */
export class PlacedTenants extends TenantVerifier {
  private readonly placed: ReadonlySet<string>;

  constructor(...tenantIds: readonly string[]) {
    super();
    this.placed = new Set(tenantIds);
  }

  override async verify(tenantId: string | undefined): Promise<boolean> {
    return tenantId !== undefined && this.placed.has(tenantId);
  }
}
