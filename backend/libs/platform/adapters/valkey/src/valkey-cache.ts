import { CacheInvalidArgumentError, CachePort } from '@platform/cache';
import { ValkeyCommand } from './valkey-command.enum.js';
import type { ValkeyCommandExecutor } from './valkey-command-executor.js';
import type { ValkeyKeyspace } from './valkey-keyspace.js';

/**
 * `CachePort` on Valkey. Each operation is an atomic command: `GET`,
 * `SET ... PX` (TTL), `SET ... NX` (`setIfAbsent`) and `DEL`. Keys end up
 * as `<prefix>:<key>`, inside the ACL of the service user. The
 * failures are `ValkeyCommandError`, classified so the cache breaker
 * opens when Valkey is down.
 */
export class ValkeyCache extends CachePort {
  constructor(
    private readonly executor: ValkeyCommandExecutor,
    private readonly keyspace: ValkeyKeyspace,
  ) {
    super();
  }

  async get(key: string): Promise<string | undefined> {
    return this.executor.optionalString(
      ValkeyCommand.Get,
      await this.executor.run(ValkeyCommand.Get, [this.keyOf(key)]),
    );
  }

  /**
   * A TTL is rounded up to whole milliseconds; a TTL of 0 deletes
   * the key, like an entry that expires instantly.
   * @throws CacheInvalidArgumentError with a negative or non-finite TTL.
   */
  async set(key: string, value: string, ttlMs?: number): Promise<void> {
    if (ttlMs === undefined) {
      await this.executor.run(ValkeyCommand.Set, [this.keyOf(key), value]);
      return;
    }
    if (!Number.isFinite(ttlMs) || ttlMs < 0) {
      throw new CacheInvalidArgumentError('ttlMs', 'a finite number >= 0');
    }
    const px = Math.ceil(ttlMs);
    if (px === 0) {
      await this.delete(key);
      return;
    }
    await this.executor.run(ValkeyCommand.Set, [
      this.keyOf(key),
      value,
      'PX',
      px,
    ]);
  }

  async setIfAbsent(key: string, value: string): Promise<boolean> {
    const reply = await this.executor.run(ValkeyCommand.Set, [
      this.keyOf(key),
      value,
      'NX',
    ]);
    return reply === 'OK';
  }

  async delete(key: string): Promise<void> {
    await this.executor.run(ValkeyCommand.Del, [this.keyOf(key)]);
  }

  private keyOf(key: string): string {
    return this.keyspace.key(key);
  }
}
