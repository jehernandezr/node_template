import type { ShardDirectoryChangeHandler } from './model/shard-directory-changed.js';
import type { ShardDirectoryChanged } from './model/shard-directory-changed.js';
import { ShardDirectoryChannel } from './ports/shard-directory-channel.js';

/**
 * Canal en proceso: lo que se publica llega a todos los suscriptores de la
 * misma instancia. Es el modo de una sola instancia y de las pruebas; entre
 * procesos se usa el canal de Valkey de `@platform/adapters-valkey` o el bus.
 */
export class InProcessDirectoryChannel extends ShardDirectoryChannel {
  private readonly handlers = new Set<ShardDirectoryChangeHandler>();

  /** Cantidad de suscripciones activas. */
  get subscriberCount(): number {
    return this.handlers.size;
  }

  async publish(event: ShardDirectoryChanged): Promise<void> {
    for (const handler of [...this.handlers]) {
      await handler(event);
    }
  }

  async subscribe(
    handler: ShardDirectoryChangeHandler,
  ): Promise<() => Promise<void>> {
    // Se envuelve para poder suscribir el mismo handler dos veces y darlo de baja una sola.
    const entry: ShardDirectoryChangeHandler = (event) => handler(event);
    this.handlers.add(entry);
    return async () => {
      this.handlers.delete(entry);
    };
  }
}
