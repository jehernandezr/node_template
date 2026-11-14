import { AsyncLocalStorage } from 'node:async_hooks';
import { ShardingError } from './errors/sharding-error.js';
import { ShardingErrorCode } from './errors/sharding-error-code.enum.js';

/**
 * Garantiza que una transacción toque un único shard lógico.
 * Se recuerda el primer shard tocado; tocar otro lanza `PLATFORM.SHARDING.CROSS_SHARD_TX`.
 *
 * Un guard por transacción, nunca por petición: el `TransactionManager` de `@platform/persistence` envuelve
 * cada transacción que abre en `TransactionShardGuard.run(fn)` y llama a `current()?.touch(shard)` antes de
 * cada sentencia. Por eso:
 * - Dos transacciones de una misma petición, una tras otra o en paralelo (`Promise.all`), cada una tiene su
 *   propio guard y puede usar shards distintos.
 * - Un savepoint o una llamada anidada que se une a la transacción abierta no debe llamar a `run` otra vez:
 *   usa el guard de la transacción a la que se une.
 * - Fuera de una transacción no hay guard (`current()` es undefined) y no se comprueba nada; las lecturas y
 *   las consultas de `acrossShards()` corren ahí.
 */
export class TransactionShardGuard {
  private static readonly storage =
    new AsyncLocalStorage<TransactionShardGuard>();

  private firstShard: string | undefined;

  /** Ejecuta el cuerpo `fn` de una transacción con un guard nuevo visible por {@link TransactionShardGuard.current}. */
  static run<T>(fn: () => T): T {
    return TransactionShardGuard.storage.run(new TransactionShardGuard(), fn);
  }

  /** El guard de la transacción que envuelve la llamada, o undefined si no hay ninguna. */
  static current(): TransactionShardGuard | undefined {
    return TransactionShardGuard.storage.getStore();
  }

  /** @throws ShardingError con `CrossShardTransaction` cuando ya se tocó otro shard distinto. */
  touch(logicalShard: string): void {
    if (this.firstShard === undefined) {
      this.firstShard = logicalShard;
      return;
    }
    if (this.firstShard !== logicalShard) {
      throw new ShardingError(
        ShardingErrorCode.CrossShardTransaction,
        'Transaction spans more than one logical shard',
        { details: { firstShard: this.firstShard, logicalShard } },
      );
    }
  }
}
