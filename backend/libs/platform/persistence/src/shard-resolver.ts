import {
  ShardAccess,
  ShardingError,
  ShardingErrorCode,
  type ShardKey,
  type ShardRouter,
  type TenantWriteWaiter,
} from '@platform/sharding';
import type { PersistenceContextProvider } from './context/persistence-context-provider.js';
import type { ShardHandle } from './model/shard-handle.js';
import type { ShardResolverOptions } from './model/shard-resolver-options.js';
import type { ShardRequest } from './model/shard-request.js';
import type { ShardDataSources } from './shard-data-sources.js';
import type { ShardScope } from './shard-scope.js';

/**
 * Del contexto de la petición, o del `ShardScope` activo, y de la declaración del módulo saca la
 * llave de enrutamiento, llama a `ShardRouter` y devuelve el `DataSource` del shard.
 */
export class ShardResolver {
  constructor(
    private readonly router: ShardRouter,
    private readonly sources: ShardDataSources,
    private readonly scope: ShardScope,
    private readonly context: PersistenceContextProvider,
    private readonly options: ShardResolverOptions,
    private readonly writeWaiter?: TenantWriteWaiter,
  ) {}

  /**
   * @throws ShardingError `KeyMissing` sin tenant, sin la llave que declara el módulo o, con `requireScope`, sin scope.
   * @throws ShardingError y `WrongRegionError` que lance `ShardRouter.resolve`.
   * @throws ShardingError `TenantMigrating` si una escritura espera más de lo permitido a que su tenant termine de
   *   trasladarse.
   */
  async resolve(request: ShardRequest): Promise<ShardHandle> {
    const scope = this.scope.current();
    let tenantId: string;
    let keyKind: ShardKey;
    let keyValue: string | undefined;

    if (scope !== undefined) {
      // El scope manda sobre la declaración del módulo: es la llave que pidió quien lo abrió.
      tenantId = scope.tenantId;
      keyKind = scope.keyKind;
      keyValue = scope.keyValue;
    } else {
      if (this.options.requireScope) {
        throw new ShardingError(
          ShardingErrorCode.KeyMissing,
          'A ShardScope is required to resolve a shard',
          { details: { requireScope: true } },
        );
      }
      const ctx = this.context.current();
      if (ctx.tenantId === undefined) {
        throw new ShardingError(
          ShardingErrorCode.KeyMissing,
          'No tenant in the request context',
          { details: { keyKind: request.feature.sharding.options.key } },
        );
      }
      tenantId = ctx.tenantId;
      const key = request.feature.sharding.keyFor(
        { tenantId: ctx.tenantId, userId: ctx.userId },
        request.source,
      );
      keyKind = key.keyKind;
      keyValue = key.keyValue;
    }

    if (request.access === ShardAccess.Write) {
      await this.writeWaiter?.awaitOpen(tenantId);
    }
    const resolved = await this.router.resolve({
      tenantId,
      keyKind,
      keyValue,
      access: request.access,
    });
    const dataSource = await this.sources.get(resolved);
    return { resolved, dataSource };
  }
}
