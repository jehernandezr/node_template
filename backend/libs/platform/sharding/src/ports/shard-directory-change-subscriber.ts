import type { ShardDirectoryChangeHandler } from '../model/shard-directory-changed.js';

/** Delivers the directory changes published by any process. */
export abstract class ShardDirectoryChangeSubscriber {
  /**
   * Listens to the directory changes of every process.
   * @returns a function that stops the subscription.
   * @param handler Called with each change.
   */
  abstract subscribe(
    handler: ShardDirectoryChangeHandler,
  ): Promise<() => Promise<void>>;
}
