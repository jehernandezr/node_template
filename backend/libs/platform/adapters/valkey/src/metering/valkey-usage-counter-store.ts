import { UsageCounterStore, type UsageWindow } from '@platform/metering';
import { LuaScript } from '../lua-script.js';
import { ValkeyCommand } from '../valkey-command.enum.js';
import type { ValkeyCommandExecutor } from '../valkey-command-executor.js';
import type { ValkeyKeyspace } from '../valkey-keyspace.js';
import { ValkeyUnexpectedReplyError } from '../valkey-unexpected-reply.error.js';

/**
 * One hash per window (`<prefix>:{usage}:<start in ms>`, field `<tenant>|<metric>`) and a sorted index
 * of the windows with data. The `{usage}` tag keeps all the keys in the same slot, so the scripts
 * also run in a cluster. Each window expires after `ttlMs` even if nobody drains it.
 */
export class ValkeyUsageCounterStore extends UsageCounterStore {
  /** One day: more than enough for the job to drain a window even if billing or the database are down for a while. */
  static readonly DEFAULT_TTL_MS = 24 * 60 * 60_000;
  private static readonly TAG = '{usage}';
  private static readonly SEPARATOR = '|';
  /** KEYS[1] window, KEYS[2] index; ARGV: field, amount, start in ms, lifetime in ms. */
  private static readonly ADD = new LuaScript(`
redis.call('HINCRBY', KEYS[1], ARGV[1], ARGV[2])
redis.call('PEXPIRE', KEYS[1], ARGV[4])
redis.call('ZADD', KEYS[2], ARGV[3], ARGV[3])
return 1
`);
  /** KEYS[1] window, KEYS[2] index; ARGV: start in ms. */
  private static readonly CLEAR = new LuaScript(`
redis.call('DEL', KEYS[1])
redis.call('ZREM', KEYS[2], ARGV[1])
return 1
`);

  constructor(
    private readonly executor: ValkeyCommandExecutor,
    private readonly keyspace: ValkeyKeyspace,
    private readonly ttlMs = ValkeyUsageCounterStore.DEFAULT_TTL_MS,
  ) {
    super();
  }

  async add(
    windowStart: Date,
    tenantId: string,
    metric: string,
    quantity: number,
  ): Promise<void> {
    const start = windowStart.getTime();
    await this.executor.script(
      ValkeyUsageCounterStore.ADD,
      [this.windowKey(start), this.indexKey()],
      [
        `${tenantId}${ValkeyUsageCounterStore.SEPARATOR}${metric}`,
        quantity,
        start,
        this.ttlMs,
      ],
    );
  }

  async pending(before: Date): Promise<readonly UsageWindow[]> {
    const reply = await this.executor.run(ValkeyCommand.ZrangeByScore, [
      this.indexKey(),
      '-inf',
      `(${before.getTime()}`,
    ]);
    if (!Array.isArray(reply)) {
      throw new ValkeyUnexpectedReplyError(
        ValkeyCommand.ZrangeByScore,
        'an array',
      );
    }
    const windows: UsageWindow[] = [];
    for (const member of reply) {
      const start = Number(member);
      windows.push({
        start: new Date(start),
        counts: await this.counts(start),
      });
    }
    return windows;
  }

  async clear(windowStart: Date): Promise<void> {
    const start = windowStart.getTime();
    await this.executor.script(
      ValkeyUsageCounterStore.CLEAR,
      [this.windowKey(start), this.indexKey()],
      [start],
    );
  }

  private async counts(start: number): Promise<UsageWindow['counts']> {
    const reply = await this.executor.run(ValkeyCommand.Hgetall, [
      this.windowKey(start),
    ]);
    if (!Array.isArray(reply)) {
      throw new ValkeyUnexpectedReplyError(ValkeyCommand.Hgetall, 'an array');
    }
    const counts = [];
    for (let index = 0; index < reply.length; index += 2) {
      const [tenantId = '', metric = ''] = String(reply[index]).split(
        ValkeyUsageCounterStore.SEPARATOR,
      );
      counts.push({ tenantId, metric, quantity: Number(reply[index + 1]) });
    }
    return counts;
  }

  private windowKey(start: number): string {
    return this.keyspace.key(ValkeyUsageCounterStore.TAG, String(start));
  }

  private indexKey(): string {
    return this.keyspace.key(ValkeyUsageCounterStore.TAG, 'windows');
  }
}
