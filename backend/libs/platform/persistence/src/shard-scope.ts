import { AsyncLocalStorage } from 'node:async_hooks';
import {
  ShardAccess,
  TransactionShardGuard,
  type ShardRouter,
} from '@platform/sharding';
import type { ShardScopeInit } from './model/shard-scope-init.js';

/**
 * Ejecuta un bloque en el shard de una llave explícita, para los casos del ADR 0023 (por ejemplo,
 * el usuario de otro tenant). Mientras el bloque corre, `ShardResolver` usa esta llave en lugar del contexto.
 */
export class ShardScope {
  private readonly storage = new AsyncLocalStorage<ShardScopeInit>();

  constructor(private readonly router: ShardRouter) {}

  /**
   * @throws ShardingError `CrossShardTransaction` si hay una transacción abierta y la llave apunta a otro shard.
   */
  async run<T>(init: ShardScopeInit, fn: () => Promise<T>): Promise<T> {
    const guard = TransactionShardGuard.current();
    if (guard !== undefined) {
      // Dentro de una transacción el bloque tiene que caer en el mismo shard que ya tocó.
      const resolved = await this.router.resolve({
        tenantId: init.tenantId,
        keyKind: init.keyKind,
        keyValue: init.keyValue,
        access: ShardAccess.Read,
      });
      guard.touch(resolved.logicalShard);
    }
    return this.storage.run(init, fn);
  }

  /** La llave del bloque que envuelve la llamada, o `undefined` si no hay ninguno. */
  current(): ShardScopeInit | undefined {
    return this.storage.getStore();
  }
}
