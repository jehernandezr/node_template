import {
  CacheInvalidArgumentError,
  CacheNotACounterError,
  type CachePort,
} from '@platform/cache';
import {
  integerReply,
  optionalStringReply,
  runCommand,
  ValkeyCommand,
  type ValkeyCommandRunner,
} from './valkey-client.js';
import { isReplyError, ValkeyCommandError } from './valkey-error.js';

/** Options of {@link ValkeyCache}. */
export interface ValkeyCacheOptions {
  /** Prepended to every key, for example the service name. Default none. */
  readonly keyPrefix?: string;
}

/**
 * {@link CachePort} over Valkey. Every operation is one atomic command:
 * `GET`, `SET ... PX` (TTL), `SET ... NX` (`setIfAbsent`), `DEL` and `INCR`.
 * Failures are `ValkeyCommandError`, classified so the cache breaker opens when Valkey is down.
 */
export class ValkeyCache implements CachePort {
  private readonly prefix: string;

  constructor(
    private readonly client: ValkeyCommandRunner,
    options: ValkeyCacheOptions = {},
  ) {
    this.prefix = options.keyPrefix ?? '';
  }

  async get(key: string): Promise<string | undefined> {
    return optionalStringReply(
      ValkeyCommand.Get,
      await runCommand(this.client, ValkeyCommand.Get, [this.key(key)]),
    );
  }

  /**
   * A TTL is rounded up to whole milliseconds; a TTL of 0 removes the key, as an entry that expires at once.
   * @throws CacheInvalidArgumentError for a negative or non-finite TTL.
   */
  async set(key: string, value: string, ttlMs?: number): Promise<void> {
    if (ttlMs === undefined) {
      await runCommand(this.client, ValkeyCommand.Set, [this.key(key), value]);
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
    await runCommand(this.client, ValkeyCommand.Set, [
      this.key(key),
      value,
      'PX',
      px,
    ]);
  }

  async setIfAbsent(key: string, value: string): Promise<boolean> {
    const reply = await runCommand(this.client, ValkeyCommand.Set, [
      this.key(key),
      value,
      'NX',
    ]);
    return reply === 'OK';
  }

  async delete(key: string): Promise<void> {
    await runCommand(this.client, ValkeyCommand.Del, [this.key(key)]);
  }

  /** @throws CacheNotACounterError when the stored value is not an integer or would overflow. */
  async incr(key: string): Promise<number> {
    let reply: unknown;
    try {
      reply = await runCommand(this.client, ValkeyCommand.Incr, [
        this.key(key),
      ]);
    } catch (error) {
      if (error instanceof ValkeyCommandError && isReplyError(error.cause)) {
        throw new CacheNotACounterError();
      }
      throw error;
    }
    if (typeof reply === 'number' && !Number.isSafeInteger(reply)) {
      throw new CacheNotACounterError();
    }
    return integerReply(ValkeyCommand.Incr, reply);
  }

  private key(key: string): string {
    return this.prefix + key;
  }
}
