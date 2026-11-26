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
 * Gets the routing key from the request context, or from the active `ShardScope`, and from the module
 * declaration, calls `ShardRouter` and returns the `DataSource` of the shard.
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
   * The scope takes precedence over the module declaration: it is the key requested by whoever opened it.
   * @param request Key and intent.
   * @returns The shard handle.
   * @throws ShardingError `KeyMissing` without a tenant, without the key declared by the module or, with `requireScope`, without a scope.
   * @throws ShardingError and `WrongRegionError` thrown by `ShardRouter.resolve`.
   * @throws ShardingError `TenantMigrating` if a write waits longer than allowed for its tenant to finish
   * relocating.
   */
  async resolve(request: ShardRequest): Promise<ShardHandle> {
    const scope = this.scope.current();
    let tenantId: string;
    let keyKind: ShardKey;
    let keyValue: string | undefined;

    if (scope !== undefined) {
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
