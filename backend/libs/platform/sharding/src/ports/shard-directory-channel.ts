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
  abstract publish(event: ShardDirectoryChanged): Promise<void>;

  abstract subscribe(
    handler: ShardDirectoryChangeHandler,
  ): Promise<() => Promise<void>>;
}
