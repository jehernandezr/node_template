import { ShardingGuard, RoutingCache } from '@platform/sharding';
import { LuaScript } from './lua-script.js';
import { ValkeyCommand } from './valkey-command.enum.js';
import type { ValkeyCommandExecutor } from './valkey-command-executor.js';
import type { ValkeyKeyspace } from './valkey-keyspace.js';
import { ValkeyRoutingField } from './valkey-routing-field.enum.js';

/**
 * `RoutingCache` de `ShardRouter` sobre Valkey. Cada entrada es un hash con el
 * valor y su versión. `setIfNewer` es un script de Lua: la revisión de versión
 * y la escritura no se intercalan con otro proceso, así la lápida de una
 * invalidación nunca la pisa un placement más viejo que venía en vuelo.
 * Las entradas viven en `<prefijo>:routing:`, dentro de la ACL del usuario del servicio.
 */
export class ValkeyRoutingCache extends RoutingCache {
  /**
   * Compare-and-set por versión en un solo paso. Escribe si la llave no existe
   * (una vencida no existe) o guarda una versión menor; una versión igual o
   * mayor se rechaza. Devuelve 1 si escribió.
   * KEYS[1] entrada; ARGV[1] valor, ARGV[2] versión, ARGV[3] TTL en ms (0 borra la entrada de una vez).
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
   * @throws ShardingError `InvalidConfiguration` con una versión que no es un
   *   entero seguro no negativo o un TTL negativo o no finito.
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
