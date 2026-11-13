import {
  ShardingError,
  ShardingErrorCode,
  type RoutingCache,
} from '@platform/sharding';
import {
  integerReply,
  LuaScript,
  optionalStringReply,
  runCommand,
  ValkeyCommand,
  type ValkeyCommandRunner,
} from './valkey-client.js';

/** Hash fields of a routing entry. */
enum RoutingField {
  Value = 'val',
  Version = 'ver',
}

/**
 * Compare-and-set by version in one atomic step. Writes when the key is absent (an expired key is absent)
 * or holds a lower version; an equal or higher version is refused. Returns 1 when written.
 * KEYS[1] entry; ARGV[1] value, ARGV[2] version, ARGV[3] TTL in ms (0 removes the entry at once).
 */
const SET_IF_NEWER = new LuaScript(`
local stored = redis.call('HGET', KEYS[1], '${RoutingField.Version}')
if stored and tonumber(stored) >= tonumber(ARGV[2]) then
  return 0
end
redis.call('HSET', KEYS[1], '${RoutingField.Value}', ARGV[1], '${RoutingField.Version}', ARGV[2])
redis.call('PEXPIRE', KEYS[1], ARGV[3])
return 1
`);

/** Options of {@link ValkeyRoutingCache}. */
export interface ValkeyRoutingCacheOptions {
  /** Prepended to every key. Default none. */
  readonly keyPrefix?: string;
}

function invalid(option: string, expectation: string): ShardingError {
  return new ShardingError(
    ShardingErrorCode.InvalidConfiguration,
    `${option} must be ${expectation}`,
    { details: { option } },
  );
}

/**
 * {@link RoutingCache} of `ShardRouter` over Valkey. Each entry is a hash with the value and its version.
 * `setIfNewer` is a Lua script, so the version check and the write cannot interleave with another process:
 * the tombstone an invalidation writes is never overwritten by an older placement read in flight.
 */
export class ValkeyRoutingCache implements RoutingCache {
  private readonly prefix: string;

  constructor(
    private readonly client: ValkeyCommandRunner,
    options: ValkeyRoutingCacheOptions = {},
  ) {
    this.prefix = options.keyPrefix ?? '';
  }

  async get(key: string): Promise<string | undefined> {
    return optionalStringReply(
      ValkeyCommand.Hget,
      await runCommand(this.client, ValkeyCommand.Hget, [
        this.key(key),
        RoutingField.Value,
      ]),
    );
  }

  /**
   * @throws ShardingError `InvalidConfiguration` for a version that is not a non-negative safe integer or a
   *   negative or non-finite TTL.
   */
  async setIfNewer(
    key: string,
    value: string,
    version: number,
    ttlMs: number,
  ): Promise<boolean> {
    if (!Number.isSafeInteger(version) || version < 0) {
      throw invalid('version', 'a non-negative safe integer');
    }
    if (!Number.isFinite(ttlMs) || ttlMs < 0) {
      throw invalid('ttlMs', 'a finite number >= 0');
    }
    const reply = await SET_IF_NEWER.run(
      this.client,
      [this.key(key)],
      [value, String(version), String(Math.ceil(ttlMs))],
    );
    return integerReply(ValkeyCommand.EvalSha, reply) === 1;
  }

  async delete(key: string): Promise<void> {
    await runCommand(this.client, ValkeyCommand.Del, [this.key(key)]);
  }

  private key(key: string): string {
    return this.prefix + key;
  }
}
