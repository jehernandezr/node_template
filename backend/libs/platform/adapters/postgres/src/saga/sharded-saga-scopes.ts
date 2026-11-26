import {
  PersistenceError,
  ShardScope,
  PersistenceErrorCode,
} from '@platform/persistence';
import { ShardKey } from '@platform/sharding';
import { SagaScopes, type SagaInstance } from '@platform/saga';

/** Runs the work of a saga on its tenant shard with a `ShardScope` of `ShardKey.Tenant`. */
export class ShardedSagaScopes extends SagaScopes {
  constructor(private readonly scope: ShardScope) {
    super();
  }

  /**
   * Pins the shard of the instance tenant while `body` runs. This way a
   * recovery, which has no request, reaches the same shard where the saga lives.
   * @throws PersistenceError `PersistenceTenantRequired` if the instance has no tenant.
   */
  override async run<T>(
    instance: SagaInstance,
    body: () => Promise<T>,
  ): Promise<T> {
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
