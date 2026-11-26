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
 * `RateLimiter` shared by all instances of a service, on
 * Valkey. Each key and rule has one counter per fixed window (`INCRBY` and
 * `PEXPIRE` in a Lua script sent with `EVALSHA`), and the sliding
 * window weighs the previous one like `InMemoryRateLimiter`: the script repeats the
 * integer arithmetic of `SlidingWindow`, so both decide the same.
 *
 * The keys store a SHA-256 of the limited key, never the key: it is usually
 * an email or an IP, which must not stay in Valkey, and the hash bounds the length.
 * The two windows of a key share a hash tag, so a script touches a
 * single slot in a cluster. The counters live in `<prefix>:ratelimit:`.
 */
export class ValkeyRateLimiter extends RateLimiter {
  /**
   * Checks and counts in a single step, with the same integer arithmetic as
   * `SlidingWindow` (every product stays below 2^53, so Lua doubles
   * are exact). A rejected call does not count. The current window lives two
   * windows, long enough to serve as the previous one.
   * KEYS[1] current window, KEYS[2] previous window.
   * ARGV[1] window ms, ARGV[2] ms elapsed in it, ARGV[3] limit, ARGV[4] cost.
   * Returns {allowed (1 or 0), previous, current after counting}.
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
   * Reads the two windows in one round trip; it is a script so both reads see the same instant.
   * KEYS[1] current window, KEYS[2] previous window. Returns {previous, current}.
   */
  private static readonly PEEK = new LuaScript(`
return {
  tonumber(redis.call('GET', KEYS[2]) or '0'),
  tonumber(redis.call('GET', KEYS[1]) or '0')
}
`);

  /**
   * @param clock Time source that places each call in its fixed window.
   *   Instances with clocks that differ by a few milliseconds only shift an edge by that difference.
   */
  constructor(
    private readonly executor: ValkeyCommandExecutor,
    private readonly keyspace: ValkeyKeyspace,
    private readonly clock: Clock,
  ) {
    super();
  }

  /** @throws InvalidArgumentError before any command, with an invalid key, rule or cost. */
  override async consume(
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

  /** @throws InvalidArgumentError before any command, with an invalid key or rule. */
  override async peek(
    key: string,
    rule: RateLimitRule,
  ): Promise<RateLimitResult> {
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

  /** @throws InvalidArgumentError before any command, with an invalid key or rule. */
  override async reset(key: string, rule: RateLimitRule): Promise<void> {
    RateLimitCallValidator.validate(key, rule);
    await this.executor.run(
      ValkeyCommand.Del,
      this.keys(key, rule, this.position(rule)),
    );
  }

  private position(rule: RateLimitRule): WindowPosition {
    return SlidingWindow.position(this.clock.now().getTime(), rule.windowMs);
  }

  /** Returns the keys `[current, previous]`: `<prefix>:ratelimit:{<rule>:<sha256>}:<windowMs>:<index>`. */
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
