import { Injectable } from '@nestjs/common';
import { RequestContextStore } from '@platform/observability';
import { ShardScope } from '@platform/persistence';
import { ShardKey } from '@platform/sharding';

/**
 * Corre un bloque en el shard del tenant y con ese tenant en el contexto, que la persistencia fija en
 * `app.tenant_id`: el RLS de las tablas de tenant no deja ver ninguna fila sin él.
 */
@Injectable()
export class TenantShard {
  constructor(
    private readonly scope: ShardScope,
    private readonly context: RequestContextStore,
  ) {}

  run<T>(tenantId: string, fn: () => Promise<T>): Promise<T> {
    return this.context.run({ ...this.context.current(), tenantId }, () =>
      this.scope.run({ tenantId, keyKind: ShardKey.Tenant }, fn),
    );
  }
}
