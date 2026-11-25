import { TenantVerifier } from '@platform/messaging';
import {
  ShardAccess,
  ShardingError,
  ShardingErrorCode,
  ShardKey,
  type ShardRouter,
} from '@platform/sharding';

/**
 * Accepts the tenant of an envelope if the shard directory places it in this region. A sharded service
 * processes each delivery in the database of the envelope's tenant, so an envelope without a tenant, with a tenant that does not
 * exist or that lives in another region has nowhere to run and goes to the dead-letter queue. Any other directory failure
 * propagates as is and the dispatcher retries it.
 */
export class PlacedTenantVerifier extends TenantVerifier {
  private static readonly NOT_PLACED: ReadonlySet<string> = new Set([
    ShardingErrorCode.UnknownTenant,
    ShardingErrorCode.InvalidTenantId,
    ShardingErrorCode.WrongRegion,
  ]);

  constructor(private readonly router: ShardRouter) {
    super();
  }

  async verify(tenantId: string | undefined): Promise<boolean> {
    if (tenantId === undefined) {
      return false;
    }
    try {
      await this.router.resolve({
        tenantId,
        keyKind: ShardKey.Tenant,
        access: ShardAccess.Read,
      });
      return true;
    } catch (error) {
      if (
        error instanceof ShardingError &&
        PlacedTenantVerifier.NOT_PLACED.has(error.code)
      ) {
        return false;
      }
      throw error;
    }
  }
}
