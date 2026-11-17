import { TenantVerifier } from '@platform/messaging';
import {
  ShardAccess,
  ShardingError,
  ShardingErrorCode,
  ShardKey,
  type ShardRouter,
} from '@platform/sharding';

/**
 * Acepta el tenant de un sobre si el directorio de shards lo ubica en esta región. Un servicio con shards
 * procesa cada entrega en la base del tenant del sobre, así que un sobre sin tenant, con un tenant que no
 * existe o que vive en otra región no tiene dónde correr y va a la cola de errores. Cualquier otra falla
 * del directorio sale tal cual y el dispatcher la reintenta.
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
