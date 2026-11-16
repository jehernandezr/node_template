import { Injectable } from '@nestjs/common';
import { ShardScope } from '@platform/persistence';
import { ShardKey } from '@platform/sharding';
import type { UserRef } from '../types/user-ref.type.js';

/**
 * Ejecuta un bloque en el shard del usuario o del tenant. Así un caso de uso no arma llaves de shard a mano
 * y el shard de cada operación sale siempre del mismo lugar.
 */
@Injectable()
export class IdentityShardScopes {
  constructor(private readonly scope: ShardScope) {}

  /** Corre el bloque en el shard del usuario, que vive en el shard de su tenant de origen. */
  inUserShard<T>(ref: UserRef, fn: () => Promise<T>): Promise<T> {
    return this.scope.run(
      {
        tenantId: ref.homeTenantId,
        keyKind: ShardKey.User,
        keyValue: ref.userId,
      },
      fn,
    );
  }

  /** Corre el bloque en el shard del tenant. */
  inTenantShard<T>(tenantId: string, fn: () => Promise<T>): Promise<T> {
    return this.scope.run({ tenantId, keyKind: ShardKey.Tenant }, fn);
  }
}
