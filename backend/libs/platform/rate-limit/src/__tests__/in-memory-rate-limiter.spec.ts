import { FixedClock } from '@platform/kernel/testing';
import { InvalidArgumentError } from '@platform/primitives';
import { InMemoryRateLimiter } from '../in-memory-rate-limiter.js';
import type { RateLimitRule } from '../rate-limit-rule.js';

const RULE: RateLimitRule = { name: 'sign-in', limit: 3, windowMs: 1_000 };
// A window boundary, so elapsed time inside the window is easy to read.
const START = new Date('2026-01-01T00:00:00.000Z');

function setup(maxEntries?: number) {
  const clock = new FixedClock(START);
  const limiter = new InMemoryRateLimiter({ clock, maxEntries });
  return { clock, limiter };
}

/** Deterministic PRNG (mulberry32), so a failure can be replayed. */
function random(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

describe('InMemoryRateLimiter', () => {
  it('allows up to the limit and then rejects without counting', async () => {
    const { limiter } = setup();
    const results = [];
    for (let i = 0; i < 5; i += 1) {
      results.push(await limiter.consume('ip-1', RULE));
    }
    expect(results.map((r) => r.allowed)).toEqual([
      true,
      true,
      true,
      false,
      false,
    ]);
    expect(results[2]).toEqual({
      allowed: true,
      count: 3,
      remaining: 0,
      retryAfterMs: 0,
    });
    expect(results[4]).toEqual({
      allowed: false,
      count: 3,
      remaining: 0,
      // The full window becomes the previous one and must fade to 2 of 3: 1 000 + 334 ms.
      retryAfterMs: 1_334,
    });
  });

  it('keeps keys and rules apart', async () => {
    const { limiter } = setup();
    await limiter.consume('ip-1', RULE, 3);
    expect((await limiter.consume('ip-2', RULE)).allowed).toBe(true);
    expect(
      (await limiter.consume('ip-1', { ...RULE, name: 'other' })).allowed,
    ).toBe(true);
    // Another window length is another set of counters.
    expect(
      (await limiter.consume('ip-1', { ...RULE, windowMs: 2_000 })).allowed,
    ).toBe(true);
    expect((await limiter.consume('ip-1', RULE)).allowed).toBe(false);
  });

  it('slides: the previous window fades as time passes', async () => {
    const { clock, limiter } = setup();
    const rule = { name: 'slide', limit: 10, windowMs: 1_000 };
    await limiter.consume('k', rule, 10);
    clock.advance(1_300);
    // 10 previous at 30 % weigh 7.
    expect(await limiter.peek('k', rule)).toEqual({
      allowed: true,
      count: 7,
      remaining: 3,
      retryAfterMs: 0,
    });
    expect((await limiter.consume('k', rule, 3)).allowed).toBe(true);
    const rejected = await limiter.consume('k', rule);
    expect(rejected).toMatchObject({ allowed: false, count: 10 });
    clock.advance(rejected.retryAfterMs - 1);
    expect((await limiter.peek('k', rule)).allowed).toBe(false);
    clock.advance(1);
    expect((await limiter.consume('k', rule)).allowed).toBe(true);
  });

  it('forgets everything after two windows', async () => {
    const { clock, limiter } = setup();
    await limiter.consume('k', RULE, 3);
    clock.advance(2_000);
    expect(await limiter.peek('k', RULE)).toEqual({
      allowed: true,
      count: 0,
      remaining: 3,
      retryAfterMs: 0,
    });
  });

  it('peeks without counting', async () => {
    const { limiter } = setup();
    await limiter.peek('k', RULE);
    await limiter.peek('k', RULE);
    expect((await limiter.consume('k', RULE, 3)).allowed).toBe(true);
  });

  it('reports a rejected peek with the wait for one unit', async () => {
    const { limiter } = setup();
    await limiter.consume('k', RULE, 3);
    expect(await limiter.peek('k', RULE)).toEqual({
      allowed: false,
      count: 3,
      remaining: 0,
      // The full window becomes the previous one and must fade to 2 of 3: 1 000 + 334 ms.
      retryAfterMs: 1_334,
    });
  });

  it('resets one key and rule', async () => {
    const { limiter } = setup();
    await limiter.consume('k', RULE, 3);
    await limiter.consume('other', RULE, 3);
    await limiter.reset('k', RULE);
    expect((await limiter.consume('k', RULE)).allowed).toBe(true);
    expect((await limiter.consume('other', RULE)).allowed).toBe(false);
  });

  it('stays in the stored window when the clock goes back', async () => {
    const { clock, limiter } = setup();
    clock.advance(1_500);
    await limiter.consume('k', RULE, 3);
    clock.set(START);
    expect((await limiter.consume('k', RULE)).allowed).toBe(false);
    // Two windows after the stored one, nothing is left.
    clock.advance(3_000);
    expect((await limiter.consume('k', RULE)).allowed).toBe(true);
  });

  it('forgets the least recently used key past maxEntries', async () => {
    const { limiter } = setup(2);
    await limiter.consume('a', RULE, 3);
    await limiter.consume('b', RULE, 3);
    // Touching `a` makes `b` the oldest.
    await limiter.consume('a', RULE);
    await limiter.consume('c', RULE, 3);
    expect((await limiter.peek('a', RULE)).count).toBe(3);
    expect((await limiter.peek('b', RULE)).count).toBe(0);
    expect((await limiter.peek('c', RULE)).count).toBe(3);
  });

  it('validates before counting', async () => {
    const { limiter } = setup();
    await expect(limiter.consume('', RULE)).rejects.toBeInstanceOf(
      InvalidArgumentError,
    );
    await expect(limiter.consume('k', RULE, 4)).rejects.toBeInstanceOf(
      InvalidArgumentError,
    );
    await expect(
      limiter.peek('k', { ...RULE, limit: 0 }),
    ).rejects.toBeInstanceOf(InvalidArgumentError);
    await expect(
      limiter.reset('k', { ...RULE, name: 'a:b' }),
    ).rejects.toBeInstanceOf(InvalidArgumentError);
  });

  it.each([0, -1, 1.5])('rejects maxEntries %p', (maxEntries) => {
    expect(() => new InMemoryRateLimiter({ maxEntries })).toThrow(
      InvalidArgumentError,
    );
  });

  it('works with the system clock by default', async () => {
    const limiter = new InMemoryRateLimiter();
    expect((await limiter.consume('k', RULE)).allowed).toBe(true);
  });

  it('keeps retryAfterMs exact under random traffic', async () => {
    const next = random(42);
    for (let round = 0; round < 200; round += 1) {
      const { clock, limiter } = setup();
      const rule = {
        name: 'random',
        limit: 1 + Math.floor(next() * 20),
        windowMs: 1 + Math.floor(next() * 5_000),
      };
      for (let step = 0; step < 30; step += 1) {
        clock.advance(Math.floor(next() * rule.windowMs * 0.5));
        const cost = 1 + Math.floor(next() * rule.limit);
        const result = await limiter.consume('k', rule, cost);
        expect(result.count).toBeLessThanOrEqual(rule.limit);
        expect(result.remaining).toBe(rule.limit - result.count);
        if (!result.allowed) {
          expect(result.retryAfterMs).toBeGreaterThan(0);
          clock.advance(result.retryAfterMs - 1);
          expect((await limiter.consume('k', rule, cost)).allowed).toBe(false);
          clock.advance(1);
          expect((await limiter.consume('k', rule, cost)).allowed).toBe(true);
        }
      }
    }
  });
});
