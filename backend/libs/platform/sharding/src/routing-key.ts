import type { ShardKey } from './model/shard-key.enum.js';

/** Entrada de enrutamiento de `ShardRouter.resolve`, sin la intención de acceso. */
export interface RoutingKey {
  readonly keyKind: ShardKey;
  /** `undefined` con `ShardKey.Tenant`: el router usa el id del tenant. */
  readonly keyValue?: string;
}
