import type {
  ShardDirectoryChangeHandler,
  ShardDirectoryChanged,
} from '../model/shard-directory-changed.js';

/**
 * Canal de cambios del directorio: publica y suscribe. Es el token con el que
 * `ShardingModule` recibe el canal del adaptador (`ValkeyShardDirectoryChannel`)
 * o el local (`InProcessDirectoryChannel`).
 */
export abstract class ShardDirectoryChannel {
  abstract publish(event: ShardDirectoryChanged): Promise<void>;

  abstract subscribe(
    handler: ShardDirectoryChangeHandler,
  ): Promise<() => Promise<void>>;
}
