import {
  LuaScript,
  ValkeyCommand,
  type ValkeyCommandExecutor,
  type ValkeyKeyspace,
} from '@platform/adapters-valkey';
import { EphemeralStore } from './ephemeral-store.js';

/** `EphemeralStore` sobre Valkey, dentro del prefijo del servicio. Los pasos compuestos son scripts de Lua. */
export class ValkeyEphemeralStore extends EphemeralStore {
  private static readonly TAKE = new LuaScript(
    "local v = redis.call('GET', KEYS[1]); if v then redis.call('DEL', KEYS[1]) end; return v",
  );
  private static readonly INCREMENT = new LuaScript(
    "local n = redis.call('INCR', KEYS[1]); if n == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end; return n",
  );
  private static readonly EXTEND = new LuaScript(
    "local t = redis.call('PTTL', KEYS[1]); if t >= 0 and t < tonumber(ARGV[1]) then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end; return 1",
  );
  private static readonly REMAINING = new LuaScript(
    "return redis.call('PTTL', KEYS[1])",
  );
  private static readonly PUT_FIELD = new LuaScript(
    "redis.call('HSET', KEYS[1], ARGV[1], ARGV[2]); redis.call('PEXPIRE', KEYS[1], ARGV[3]); return 1",
  );
  private static readonly TAKE_FIELDS = new LuaScript(
    "local v = redis.call('HGETALL', KEYS[1]); redis.call('DEL', KEYS[1]); return v",
  );

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

  async set(key: string, value: string, ttlMs: number): Promise<void> {
    await this.executor.run(ValkeyCommand.Set, [
      this.keyOf(key),
      value,
      'PX',
      Math.max(1, Math.ceil(ttlMs)),
    ]);
  }

  async setIfAbsent(
    key: string,
    value: string,
    ttlMs: number,
  ): Promise<boolean> {
    const reply = await this.executor.run(ValkeyCommand.Set, [
      this.keyOf(key),
      value,
      'PX',
      Math.max(1, Math.ceil(ttlMs)),
      'NX',
    ]);
    return reply === 'OK';
  }

  async take(key: string): Promise<string | undefined> {
    return this.executor.optionalString(
      ValkeyCommand.EvalSha,
      await this.executor.script(
        ValkeyEphemeralStore.TAKE,
        [this.keyOf(key)],
        [],
      ),
    );
  }

  async delete(key: string): Promise<void> {
    await this.executor.run(ValkeyCommand.Del, [this.keyOf(key)]);
  }

  async increment(key: string, ttlMs: number): Promise<number> {
    return this.executor.integer(
      ValkeyCommand.EvalSha,
      await this.executor.script(
        ValkeyEphemeralStore.INCREMENT,
        [this.keyOf(key)],
        [Math.max(1, Math.ceil(ttlMs))],
      ),
    );
  }

  async extend(key: string, ttlMs: number): Promise<void> {
    await this.executor.script(
      ValkeyEphemeralStore.EXTEND,
      [this.keyOf(key)],
      [Math.max(1, Math.ceil(ttlMs))],
    );
  }

  async remainingMs(key: string): Promise<number | undefined> {
    const ttl = this.executor.integer(
      ValkeyCommand.EvalSha,
      await this.executor.script(
        ValkeyEphemeralStore.REMAINING,
        [this.keyOf(key)],
        [],
      ),
    );
    return ttl < 0 ? undefined : ttl;
  }

  async putField(
    key: string,
    field: string,
    value: string,
    ttlMs: number,
  ): Promise<void> {
    await this.executor.script(
      ValkeyEphemeralStore.PUT_FIELD,
      [this.keyOf(key)],
      [field, value, Math.max(1, Math.ceil(ttlMs))],
    );
  }

  async takeFields(key: string): Promise<ReadonlyMap<string, string>> {
    const reply = await this.executor.script(
      ValkeyEphemeralStore.TAKE_FIELDS,
      [this.keyOf(key)],
      [],
    );
    const flat = Array.isArray(reply) ? reply.map(String) : [];
    const fields = new Map<string, string>();
    for (let i = 0; i + 1 < flat.length; i += 2) {
      fields.set(flat[i] as string, flat[i + 1] as string);
    }
    return fields;
  }

  private keyOf(key: string): string {
    return this.keyspace.key(key);
  }
}
