import { Injectable } from '@nestjs/common';
import { RequestContextStore } from '@platform/observability';
import { ShardScope } from '@platform/persistence';
import { ShardKey } from '@platform/sharding';
import type { UserRef } from '../types/user-ref.type.js';

/**
 * Ejecuta un bloque en el shard del usuario o del tenant. Así un caso de uso no arma llaves de shard a mano
 * y el shard de cada operación sale siempre del mismo lugar.
 */
@Injectable()
export class IdentityShardScopes {
  constructor(
    private readonly scope: ShardScope,
    private readonly context: RequestContextStore,
  ) {}

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

  /**
   * Corre el bloque en el shard del tenant y con ese tenant en el contexto: la persistencia lo fija en
   * `app.tenant_id` al abrir cada transacción, `TenantShardRepository` lo fija también en cada lectura, y las
   * políticas de RLS de las tablas de tenant no dejan ver ninguna fila sin él.
   * Identity trabaja sobre tenants que no son el de la sesión (aceptar una invitación, cambiar de tenant,
   * las operaciones internas), así que el tenant del contexto es el del bloque, no el de quien llama.
   */
  inTenantShard<T>(tenantId: string, fn: () => Promise<T>): Promise<T> {
    const current = this.context.current();
    return this.context.run({ ...current, tenantId }, () =>
      this.scope.run({ tenantId, keyKind: ShardKey.Tenant }, fn),
    );
  }
}
