import type {
  ShardDirectoryChangeHandler,
  ShardDirectoryChanged,
} from '../model/shard-directory-changed.js';

/**
 * Directory change channel: publishes and subscribes. It is the token through which
 * `ShardingModule` receives the adapter channel (`ValkeyShardDirectoryChannel`)
 * or the local one (`InProcessDirectoryChannel`).
 */
export abstract class ShardDirectoryChannel {
  /**
   * Announces a directory change to every process.
   * @param event Directory change.
   */
  abstract publish(event: ShardDirectoryChanged): Promise<void>;

  /**
   * Listens to the directory changes of every process.
   * @param handler Called with each change.
   * @returns The unsubscribe function.
   */
  abstract subscribe(
    handler: ShardDirectoryChangeHandler,
  ): Promise<() => Promise<void>>;
}
