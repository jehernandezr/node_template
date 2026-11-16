import { createHash } from 'node:crypto';
import type { Clock } from '@platform/kernel';
import {
  RateLimitCallValidator,
  RateLimiter,
  SlidingWindow,
  type RateLimitResult,
  type RateLimitRule,
  type WindowCounts,
  type WindowPosition,
} from '@platform/rate-limit';
import { LuaScript } from './lua-script.js';
import { ValkeyCommand } from './valkey-command.enum.js';
import type { ValkeyCommandExecutor } from './valkey-command-executor.js';
import type { ValkeyKeyspace } from './valkey-keyspace.js';
import { ValkeyUnexpectedReplyError } from './valkey-unexpected-reply.error.js';

/**
 * `RateLimiter` compartido por todas las instancias de un servicio, sobre
 * Valkey. Cada llave y regla tiene un contador por ventana fija (`INCRBY` y
 * `PEXPIRE` en un script de Lua que se envía con `EVALSHA`), y la ventana
 * deslizante pesa la anterior como `InMemoryRateLimiter`: el script repite la
 * aritmética entera de `SlidingWindow`, así que ambos deciden igual.
 *
 * Las llaves guardan un SHA-256 de la llave limitada, nunca la llave: suele ser
 * un correo o una IP, que no deben quedar en Valkey, y el hash acota el largo.
 * Las dos ventanas de una llave comparten una hash tag, así un script toca un
 * solo slot en un clúster. Los contadores viven en `<prefijo>:ratelimit:`.
 */
export class ValkeyRateLimiter extends RateLimiter {
  /**
   * Revisa y cuenta en un solo paso, con la misma aritmética entera de
   * `SlidingWindow` (todo producto queda bajo 2^53, así que los dobles de Lua
   * son exactos). Una llamada rechazada no cuenta. La ventana actual vive dos
   * ventanas, lo bastante para servir de anterior.
   * KEYS[1] ventana actual, KEYS[2] ventana anterior.
   * ARGV[1] ms de la ventana, ARGV[2] ms transcurridos en ella, ARGV[3] límite, ARGV[4] costo.
   * Devuelve {permitido (1 o 0), anterior, actual tras contar}.
   */
  private static readonly CONSUME = new LuaScript(`
local window = tonumber(ARGV[1])
local cost = tonumber(ARGV[4])
local current = tonumber(redis.call('GET', KEYS[1]) or '0')
local previous = tonumber(redis.call('GET', KEYS[2]) or '0')
local weighted = previous * (window - tonumber(ARGV[2])) + current * window
if weighted + cost * window > tonumber(ARGV[3]) * window then
  return {0, previous, current}
end
current = redis.call('INCRBY', KEYS[1], cost)
redis.call('PEXPIRE', KEYS[1], 2 * window)
return {1, previous, current}
`);

  /**
   * Lee las dos ventanas en un viaje; es un script para que ambas lecturas vean el mismo instante.
   * KEYS[1] ventana actual, KEYS[2] ventana anterior. Devuelve {anterior, actual}.
   */
  private static readonly PEEK = new LuaScript(`
return {
  tonumber(redis.call('GET', KEYS[2]) or '0'),
  tonumber(redis.call('GET', KEYS[1]) or '0')
}
`);

  /**
   * @param clock Fuente de tiempo que ubica cada llamada en su ventana fija.
   *   Instancias con relojes que difieren unos milisegundos solo corren un borde esa diferencia.
   */
  constructor(
    private readonly executor: ValkeyCommandExecutor,
    private readonly keyspace: ValkeyKeyspace,
    private readonly clock: Clock,
  ) {
    super();
  }

  /** @throws InvalidArgumentError antes de cualquier comando, con una llave, regla o costo inválidos. */
  async consume(
    key: string,
    rule: RateLimitRule,
    cost = 1,
  ): Promise<RateLimitResult> {
    RateLimitCallValidator.validate(key, rule, cost);
    const position = this.position(rule);
    const [allowed, previous, current] = this.integers(
      await this.executor.script(
        ValkeyRateLimiter.CONSUME,
        this.keys(key, rule, position),
        [rule.windowMs, position.elapsedMs, rule.limit, cost],
      ),
      3,
    );
    const counts: WindowCounts = { previous, current };
    return SlidingWindow.result(counts, position, rule, allowed === 1, cost);
  }

  /** @throws InvalidArgumentError antes de cualquier comando, con una llave o regla inválidas. */
  async peek(key: string, rule: RateLimitRule): Promise<RateLimitResult> {
    RateLimitCallValidator.validate(key, rule);
    const position = this.position(rule);
    const [previous, current] = this.integers(
      await this.executor.script(
        ValkeyRateLimiter.PEEK,
        this.keys(key, rule, position),
        [],
      ),
      2,
    );
    const counts: WindowCounts = { previous, current };
    return SlidingWindow.result(
      counts,
      position,
      rule,
      SlidingWindow.admits(counts, position, rule, 1),
      1,
    );
  }

  /** @throws InvalidArgumentError antes de cualquier comando, con una llave o regla inválidas. */
  async reset(key: string, rule: RateLimitRule): Promise<void> {
    RateLimitCallValidator.validate(key, rule);
    await this.executor.run(
      ValkeyCommand.Del,
      this.keys(key, rule, this.position(rule)),
    );
  }

  private position(rule: RateLimitRule): WindowPosition {
    return SlidingWindow.position(this.clock.now().getTime(), rule.windowMs);
  }

  /** Llaves `[actual, anterior]`: `<prefijo>:ratelimit:{<regla>:<sha256>}:<windowMs>:<índice>`. */
  private keys(
    key: string,
    rule: RateLimitRule,
    position: WindowPosition,
  ): string[] {
    const digest = createHash('sha256').update(key).digest('base64url');
    const counter = (index: number): string =>
      this.keyspace.key(
        'ratelimit',
        `{${rule.name}:${digest}}`,
        String(rule.windowMs),
        String(index),
      );
    return [counter(position.index), counter(position.index - 1)];
  }

  private integers(reply: unknown, length: number): number[] {
    if (
      !Array.isArray(reply) ||
      reply.length !== length ||
      !reply.every((value) => Number.isSafeInteger(value) && value >= 0)
    ) {
      throw new ValkeyUnexpectedReplyError(
        ValkeyCommand.EvalSha,
        `an array of ${length} non-negative integers`,
      );
    }
    return reply as number[];
  }
}
