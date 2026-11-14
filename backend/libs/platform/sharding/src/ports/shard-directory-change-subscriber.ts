import type { ShardDirectoryChangeHandler } from '../model/shard-directory-changed.js';

/** Entrega los cambios del directorio que publique cualquier proceso. */
export abstract class ShardDirectoryChangeSubscriber {
  /** @returns una función que detiene la suscripción. */
  abstract subscribe(
    handler: ShardDirectoryChangeHandler,
  ): Promise<() => Promise<void>>;
}
