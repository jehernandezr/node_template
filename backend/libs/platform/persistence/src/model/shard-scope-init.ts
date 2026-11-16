import type { ShardKey } from '@platform/sharding';

/** Llave explícita de un `ShardScope`: el tenant dueño de los datos y cómo se elige el shard. */
export interface ShardScopeInit {
  readonly tenantId: string;
  readonly keyKind: ShardKey;
  /** Obligatoria salvo con `ShardKey.Tenant`. */
  readonly keyValue?: string;
}
