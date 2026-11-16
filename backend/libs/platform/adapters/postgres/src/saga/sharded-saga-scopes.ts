import {
  PersistenceError,
  ShardScope,
  PersistenceErrorCode,
} from '@platform/persistence';
import { ShardKey } from '@platform/sharding';
import { SagaScopes, type SagaInstance } from '@platform/saga';

/** Corre el trabajo de una saga en el shard de su tenant con un `ShardScope` de `ShardKey.Tenant`. */
export class ShardedSagaScopes extends SagaScopes {
  constructor(private readonly scope: ShardScope) {
    super();
  }

  /**
   * Fija el shard del tenant de la instancia mientras corre `body`. Así una
   * recuperación, que no tiene petición, llega al mismo shard donde vive la saga.
   * @throws PersistenceError `PersistenceTenantRequired` si la instancia no tiene tenant.
   */
  async run<T>(instance: SagaInstance, body: () => Promise<T>): Promise<T> {
    const tenantId = instance.tenantId;
    if (tenantId === null) {
      throw new PersistenceError(
        PersistenceErrorCode.TenantRequired,
        'The saga has no tenant to route it',
      );
    }
    return this.scope.run({ tenantId, keyKind: ShardKey.Tenant }, body);
  }
}
