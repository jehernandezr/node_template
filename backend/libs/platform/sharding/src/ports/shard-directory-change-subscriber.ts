import type { ShardDirectoryChangeHandler } from '../model/shard-directory-changed.js';

/** Delivers the directory changes published by any process. */
export abstract class ShardDirectoryChangeSubscriber {
  /** @returns a function that stops the subscription. */
  abstract subscribe(
    handler: ShardDirectoryChangeHandler,
  ): Promise<() => Promise<void>>;
}
