import type { Clock } from '@platform/kernel';
import { PresenceTracker } from '@platform/realtime';
import { LuaScript } from '../lua-script.js';
import { ValkeyCommand } from '../valkey-command.enum.js';
import type { ValkeyCommandExecutor } from '../valkey-command-executor.js';
import type { ValkeyKeyspace } from '../valkey-keyspace.js';

/**
 * Presencia en un sorted set por canal (`<prefijo>:presence:{canal}`): cada conexión con su vencimiento como
 * puntaje. Un proceso que cae deja marcas que vencen solas, sin depender de que avise.
 */
export class ValkeyPresenceTracker extends PresenceTracker {
  /** KEYS[1] set; ARGV: conexión, vencimiento en ms epoch, vida en ms. */
  private static readonly CONNECT = new LuaScript(`
redis.call('ZADD', KEYS[1], ARGV[2], ARGV[1])
if redis.call('PTTL', KEYS[1]) < tonumber(ARGV[3]) then
  redis.call('PEXPIRE', KEYS[1], ARGV[3])
end
return 1
`);
  /** KEYS[1] set; ARGV[1] ahora en ms epoch. Limpia lo vencido y cuenta lo vigente. */
  private static readonly ONLINE = new LuaScript(`
redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', ARGV[1])
return redis.call('ZCARD', KEYS[1])
`);

  constructor(
    private readonly executor: ValkeyCommandExecutor,
    private readonly keyspace: ValkeyKeyspace,
    private readonly clock: Clock,
  ) {
    super();
  }

  async connected(
    channel: string,
    connectionId: string,
    ttlMs: number,
  ): Promise<void> {
    await this.executor.script(
      ValkeyPresenceTracker.CONNECT,
      [this.key(channel)],
      [connectionId, this.clock.now().getTime() + ttlMs, ttlMs],
    );
  }

  async disconnected(channel: string, connectionId: string): Promise<void> {
    await this.executor.run(ValkeyCommand.Zrem, [
      this.key(channel),
      connectionId,
    ]);
  }

  async isOnline(channel: string): Promise<boolean> {
    const reply = await this.executor.script(
      ValkeyPresenceTracker.ONLINE,
      [this.key(channel)],
      [this.clock.now().getTime()],
    );
    return this.executor.integer(ValkeyCommand.EvalSha, reply) > 0;
  }

  private key(channel: string): string {
    return this.keyspace.key('presence', channel);
  }
}
