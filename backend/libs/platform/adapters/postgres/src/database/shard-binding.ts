import { AsyncLocalStorage } from 'node:async_hooks';
import type { ShardConnection } from '@platform/persistence';

/**
 * Fija un shard lógico para el bloque que corre, sin tenant ni petición: lo usan el relay del outbox y las
 * tareas de mantenimiento, que recorren todos los shards. Mientras hay un shard fijo, `PlatformEntityManagers`
 * trabaja contra ese `DataSource` en lugar de resolver el shard por el tenant del contexto.
 */
export class ShardBinding {
  private readonly storage = new AsyncLocalStorage<ShardConnection>();

  run<T>(connection: ShardConnection, fn: () => Promise<T>): Promise<T> {
    return this.storage.run(connection, fn);
  }

  /** El shard fijo del bloque que envuelve la llamada, o `undefined` si no hay ninguno. */
  current(): ShardConnection | undefined {
    return this.storage.getStore();
  }
}
