import { SlidingWindow } from '../sliding-window.js';
import type { RateLimitRule } from '../rate-limit-rule.js';

const RULE: RateLimitRule = { name: 'window', limit: 3, windowMs: 1000 };

describe('SlidingWindow', () => {
  it.each([
    [0, 1000, 0, 0],
    [999, 1000, 0, 999],
    [1500, 1000, 1, 500],
    [2999, 1000, 2, 999],
  ])(
    'places time %p in window %p with elapsed %p',
    (nowMs, windowMs, index, elapsedMs) => {
      expect(SlidingWindow.position(nowMs, windowMs)).toEqual({
        index,
        elapsedMs,
      });
    },
  );

  it.each([
    [{ previous: 0, current: 2 }, { index: 1, elapsedMs: 0 }, 1, true],
    [{ previous: 0, current: 2 }, { index: 1, elapsedMs: 0 }, 2, false],
    [{ previous: 2, current: 0 }, { index: 5, elapsedMs: 500 }, 2, true],
    [{ previous: 3, current: 0 }, { index: 5, elapsedMs: 0 }, 1, false],
  ])('admits %j at %j with cost %p: %p', (counts, position, cost, expected) => {
    expect(SlidingWindow.admits(counts, position, RULE, cost)).toBe(expected);
  });

  it.each([
    [
      { previous: 0, current: 1 },
      { index: 0, elapsedMs: 0 },
      true,
      { allowed: true, count: 1, remaining: 2, retryAfterMs: 0 },
    ],
    [
      { previous: 2, current: 0 },
      { index: 5, elapsedMs: 500 },
      true,
      { allowed: true, count: 1, remaining: 2, retryAfterMs: 0 },
    ],
    [
      { previous: 0, current: 3 },
      { index: 0, elapsedMs: 0 },
      false,
      { allowed: false, count: 3, remaining: 0, retryAfterMs: 1334 },
    ],
    [
      { previous: 3, current: 1 },
      { index: 1, elapsedMs: 334 },
      false,
      { allowed: false, count: 3, remaining: 0, retryAfterMs: 333 },
    ],
  ])(
    'builds the result for %j at %j',
    (counts, position, allowed, expected) => {
      expect(SlidingWindow.result(counts, position, RULE, allowed, 1)).toEqual(
        expected,
      );
    },
  );
});
