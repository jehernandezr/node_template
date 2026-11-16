import { createHash } from 'node:crypto';
import { SystemClock, type Clock } from '@platform/kernel';
import {
  admits,
  assertRateLimitCall,
  RateLimiter,
  slidingWindowResult,
  windowPosition,
  type RateLimitResult,
  type RateLimitRule,
  type WindowCounts,
  type WindowPosition,
} from '@platform/rate-limit';
import {
  LuaScript,
  runCommand,
  ValkeyCommand,
  type ValkeyCommandRunner,
} from '../valkey-client.js';
import { ValkeyUnexpectedReplyError } from '../valkey-error.js';
import type { ValkeyKeyspace } from '../valkey-keyspace.js';

/**
 * Check and count in one atomic step, with the same integer arithmetic as `admits` of `@platform/rate-limit`
 * (every product stays below 2^53, so Lua's doubles are exact). A rejected call counts nothing. The current
 * window lives two windows, long enough to serve as the previous one.
 * KEYS[1] current window, KEYS[2] previous window.
 * ARGV[1] window ms, ARGV[2] elapsed ms in the window, ARGV[3] limit, ARGV[4] cost.
 * Returns {allowed (1 or 0), previous, current after counting}.
 */
const CONSUME = new LuaScript(`
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
 * Reads both windows in one round trip; a script, so both reads see the same instant.
 * KEYS[1] current window, KEYS[2] previous window. Returns {previous, current}.
 */
const PEEK = new LuaScript(`
return {
  tonumber(redis.call('GET', KEYS[2]) or '0'),
  tonumber(redis.call('GET', KEYS[1]) or '0')
}
`);

/** Options of {@link ValkeyRateLimiter}. */
export interface ValkeyRateLimiterOptions {
  /** Counters live under `<prefix>:ratelimit:`, inside the ACL of the service user. */
  readonly keyspace: ValkeyKeyspace;
  /**
   * Time source that places each call in its fixed window. Defaults to `SystemClock`. Instances whose clocks
   * drift by a few milliseconds only shift a boundary by that much.
   */
  readonly clock?: Clock;
}

function nonNegativeIntegers(
  reply: unknown,
  length: number,
): readonly number[] {
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

/**
 * {@link RateLimiter} shared by every instance of a service, over Valkey. Each key and rule has one counter
 * per fixed window (`INCRBY` and `PEXPIRE` in a Lua script run with `EVALSHA`), and the sliding window
 * weighs the previous one as `InMemoryRateLimiter` does.
 *
 * Keys hold a SHA-256 of the limited key, never the key itself: it is often an email or an IP, which stay out
 * of Valkey, and the hash bounds the key length. Both windows of a key share a hash tag, so a script touches a
 * single slot on a cluster.
 */
export class ValkeyRateLimiter extends RateLimiter {
  private readonly keyspace: ValkeyKeyspace;
  private readonly clock: Clock;

  constructor(
    private readonly client: ValkeyCommandRunner,
    options: ValkeyRateLimiterOptions,
  ) {
    super();
    this.keyspace = options.keyspace;
    this.clock = options.clock ?? new SystemClock();
  }

  /** @throws InvalidArgumentError before any command, for an invalid key, rule or cost. */
  async consume(
    key: string,
    rule: RateLimitRule,
    cost = 1,
  ): Promise<RateLimitResult> {
    assertRateLimitCall(key, rule, cost);
    const position = this.position(rule);
    const [allowed, previous, current] = nonNegativeIntegers(
      await CONSUME.run(this.client, this.keys(key, rule, position), [
        rule.windowMs,
        position.elapsedMs,
        rule.limit,
        cost,
      ]),
      3,
    ) as [number, number, number];
    const counts: WindowCounts = { previous, current };
    return slidingWindowResult(counts, position, rule, allowed === 1, cost);
  }

  /** @throws InvalidArgumentError before any command, for an invalid key or rule. */
  async peek(key: string, rule: RateLimitRule): Promise<RateLimitResult> {
    assertRateLimitCall(key, rule);
    const position = this.position(rule);
    const [previous, current] = nonNegativeIntegers(
      await PEEK.run(this.client, this.keys(key, rule, position), []),
      2,
    ) as [number, number];
    const counts: WindowCounts = { previous, current };
    return slidingWindowResult(
      counts,
      position,
      rule,
      admits(counts, position, rule, 1),
      1,
    );
  }

  /** @throws InvalidArgumentError before any command, for an invalid key or rule. */
  async reset(key: string, rule: RateLimitRule): Promise<void> {
    assertRateLimitCall(key, rule);
    await runCommand(
      this.client,
      ValkeyCommand.Del,
      this.keys(key, rule, this.position(rule)),
    );
  }

  private position(rule: RateLimitRule): WindowPosition {
    return windowPosition(this.clock.now().getTime(), rule.windowMs);
  }

  /** `[current, previous]` window keys: `<prefix>:ratelimit:{<rule>:<sha256>}:<windowMs>:<index>`. */
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
}
