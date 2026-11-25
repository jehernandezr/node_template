import { ShardingGuard, RoutingCache } from '@platform/sharding';
import { LuaScript } from './lua-script.js';
import { ValkeyCommand } from './valkey-command.enum.js';
import type { ValkeyCommandExecutor } from './valkey-command-executor.js';
import type { ValkeyKeyspace } from './valkey-keyspace.js';
import { ValkeyRoutingField } from './valkey-routing-field.enum.js';

/**
 * `RoutingCache` of `ShardRouter` on Valkey. Each entry is a hash with the
 * value and its version. `setIfNewer` is a Lua script: the version check
 * and the write do not interleave with another process, so the tombstone of an
 * invalidation is never overwritten by an older placement that was in flight.
 * The entries live in `<prefix>:routing:`, inside the ACL of the service user.
 */
export class ValkeyRoutingCache extends RoutingCache {
  /**
   * Compare-and-set by version in a single step. Writes if the key does not exist
   * (an expired one does not exist) or holds a lower version; an equal or
   * greater version is rejected. Returns 1 if it wrote.
   * KEYS[1] entry; ARGV[1] value, ARGV[2] version, ARGV[3] TTL in ms (0 deletes the entry at once).
   */
  private static readonly SET_IF_NEWER = new LuaScript(`
local stored = redis.call('HGET', KEYS[1], '${ValkeyRoutingField.Version}')
if stored and tonumber(stored) >= tonumber(ARGV[2]) then
  return 0
end
redis.call('HSET', KEYS[1], '${ValkeyRoutingField.Value}', ARGV[1], '${ValkeyRoutingField.Version}', ARGV[2])
redis.call('PEXPIRE', KEYS[1], ARGV[3])
return 1
`);

  constructor(
    private readonly executor: ValkeyCommandExecutor,
    private readonly keyspace: ValkeyKeyspace,
  ) {
    super();
  }

  async get(key: string): Promise<string | undefined> {
    return this.executor.optionalString(
      ValkeyCommand.Hget,
      await this.executor.run(ValkeyCommand.Hget, [
        this.keyOf(key),
        ValkeyRoutingField.Value,
      ]),
    );
  }

  /**
   * @throws ShardingError `InvalidConfiguration` with a version that is not a
   *   non-negative safe integer or a negative or non-finite TTL.
   */
  async setIfNewer(
    key: string,
    value: string,
    version: number,
    ttlMs: number,
  ): Promise<boolean> {
    ShardingGuard.instance.integerInRange(
      'version',
      version,
      0,
      Number.MAX_SAFE_INTEGER,
    );
    ShardingGuard.instance.nonNegativeFinite('ttlMs', ttlMs);
    const reply = await this.executor.script(
      ValkeyRoutingCache.SET_IF_NEWER,
      [this.keyOf(key)],
      [value, String(version), String(Math.ceil(ttlMs))],
    );
    return this.executor.integer(ValkeyCommand.EvalSha, reply) === 1;
  }

  async delete(key: string): Promise<void> {
    await this.executor.run(ValkeyCommand.Del, [this.keyOf(key)]);
  }

  private keyOf(key: string): string {
    return this.keyspace.key('routing', key);
  }
}
