import type { ShardDirectoryChanged } from '../model/shard-directory-changed.js';

/**
 * Publishes directory changes to every process of the service. Delivery
 * is at most once: a lost message is covered by the shared cache tombstone
 * and the in-process TTL.
 */
export abstract class ShardDirectoryChangePublisher {
  abstract publish(event: ShardDirectoryChanged): Promise<void>;
}
