import { FixedClock } from '@platform/kernel/test-utils';
import { InvalidArgumentError } from '@platform/primitives';
import type { RateLimitResult } from '../../rate-limit-result.js';
import type { RateLimitRule } from '../../rate-limit-rule.js';
import type { RateLimiter } from '../../rate-limiter.js';

const START = new Date('2025-01-01T00:00:00.000Z');
const KEY = 'k';
const RULE: RateLimitRule = { name: 'contract.rule', limit: 3, windowMs: 1000 };

/**
 * Tests that every {@link RateLimiter} must pass. The values come from the
 * reference sliding window; they are not recomputed here.
 */
export function runRateLimiterContract(
  name: string,
  factory: (clock: FixedClock) => RateLimiter,
): void {
  describe(name, () => {
    it('admits the first units of the window and reports the count', async () => {
      const limiter = factory(new FixedClock(START));
      await expect(limiter.consume(KEY, RULE)).resolves.toEqual({
        allowed: true,
        count: 1,
        remaining: 2,
        retryAfterMs: 0,
      });
      await expect(limiter.consume(KEY, RULE)).resolves.toEqual({
        allowed: true,
        count: 2,
        remaining: 1,
        retryAfterMs: 0,
      });
      await expect(limiter.consume(KEY, RULE)).resolves.toEqual({
        allowed: true,
        count: 3,
        remaining: 0,
        retryAfterMs: 0,
      });
    });

    it('rejects over the limit with the wait and does not count the rejection', async () => {
      const limiter = factory(new FixedClock(START));
      await consumeTimes(limiter, 3);
      const rejected: RateLimitResult = {
        allowed: false,
        count: 3,
        remaining: 0,
        retryAfterMs: 1334,
      };
      await expect(limiter.consume(KEY, RULE)).resolves.toEqual(rejected);
      await expect(limiter.consume(KEY, RULE)).resolves.toEqual(rejected);
    });

    it('weighs the previous window and reports the wait for the next unit', async () => {
      const clock = new FixedClock(START);
      const limiter = factory(clock);
      await consumeTimes(limiter, 3);
      clock.advance(1334);
      const peeked: RateLimitResult = {
        allowed: true,
        count: 2,
        remaining: 1,
        retryAfterMs: 0,
      };
      await expect(limiter.peek(KEY, RULE)).resolves.toEqual(peeked);
      await expect(limiter.peek(KEY, RULE)).resolves.toEqual(peeked);
      await expect(limiter.consume(KEY, RULE)).resolves.toEqual({
        allowed: true,
        count: 3,
        remaining: 0,
        retryAfterMs: 0,
      });
      await expect(limiter.consume(KEY, RULE)).resolves.toEqual({
        allowed: false,
        count: 3,
        remaining: 0,
        retryAfterMs: 333,
      });
    });

    it('starts from zero after reset', async () => {
      const limiter = factory(new FixedClock(START));
      await consumeTimes(limiter, 3);
      await limiter.reset(KEY, RULE);
      await expect(limiter.peek(KEY, RULE)).resolves.toEqual({
        allowed: true,
        count: 0,
        remaining: 3,
        retryAfterMs: 0,
      });
    });

    it('keeps keys and rule names apart', async () => {
      const limiter = factory(new FixedClock(START));
      await consumeTimes(limiter, 3);
      await expect(limiter.peek('other', RULE)).resolves.toMatchObject({
        count: 0,
      });
      await expect(
        limiter.peek(KEY, { ...RULE, name: 'other.rule' }),
      ).resolves.toMatchObject({ count: 0 });
    });

    it.each<[string, (limiter: RateLimiter) => Promise<unknown>]>([
      ['an empty key', (limiter) => limiter.consume('', RULE)],
      ['a zero cost', (limiter) => limiter.consume(KEY, RULE, 0)],
      ['a cost above the limit', (limiter) => limiter.consume(KEY, RULE, 4)],
      [
        'a rule with zero limit',
        (limiter) => limiter.consume(KEY, { ...RULE, limit: 0 }),
      ],
    ])(
      'rejects %s with InvalidArgumentError and counts nothing',
      async (_label, call) => {
        const limiter = factory(new FixedClock(START));
        await expect(call(limiter)).rejects.toBeInstanceOf(
          InvalidArgumentError,
        );
        await expect(limiter.peek(KEY, RULE)).resolves.toMatchObject({
          count: 0,
        });
      },
    );
  });
}

/** Consumes `times` units of cost 1 and returns the last response. */
async function consumeTimes(
  limiter: RateLimiter,
  times: number,
): Promise<RateLimitResult> {
  let last: RateLimitResult | undefined;
  for (let index = 0; index < times; index += 1) {
    last = await limiter.consume(KEY, RULE);
  }
  if (last === undefined) {
    throw new Error('consumeTimes needs at least one call');
  }
  return last;
}
