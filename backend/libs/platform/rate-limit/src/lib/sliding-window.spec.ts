import {
  RATE_LIMIT_MAX_LIMIT,
  RATE_LIMIT_MAX_WINDOW_MS,
  type RateLimitRule,
} from './rate-limit-rule.js';
import {
  admits,
  slidingWindowResult,
  windowPosition,
} from './sliding-window.js';

const RULE: RateLimitRule = { name: 'r', limit: 10, windowMs: 1_000 };

describe('windowPosition', () => {
  it('splits time into fixed windows', () => {
    expect(windowPosition(0, 1_000)).toEqual({ index: 0, elapsedMs: 0 });
    expect(windowPosition(999, 1_000)).toEqual({ index: 0, elapsedMs: 999 });
    expect(windowPosition(1_000, 1_000)).toEqual({ index: 1, elapsedMs: 0 });
    expect(windowPosition(1_735_689_600_250, 60_000)).toEqual({
      index: 28_928_160,
      elapsedMs: 250,
    });
  });
});

describe('admits', () => {
  it('weighs the previous window by the part still inside the sliding window', () => {
    // 10 previous at 30 % elapsed weigh 7, so 3 more fit and 4 do not.
    const position = { index: 5, elapsedMs: 300 };
    const counts = { previous: 10, current: 0 };
    expect(admits(counts, position, RULE, 3)).toBe(true);
    expect(admits(counts, position, RULE, 4)).toBe(false);
  });

  it('counts the current window in full', () => {
    const position = { index: 5, elapsedMs: 999 };
    expect(admits({ previous: 0, current: 9 }, position, RULE, 1)).toBe(true);
    expect(admits({ previous: 0, current: 10 }, position, RULE, 1)).toBe(false);
  });

  it('stays exact at the largest rule', () => {
    const rule = {
      name: 'max',
      limit: RATE_LIMIT_MAX_LIMIT,
      windowMs: RATE_LIMIT_MAX_WINDOW_MS,
    };
    const position = { index: 1, elapsedMs: RATE_LIMIT_MAX_WINDOW_MS - 1 };
    // The previous window weighs 10^6 / W, a hair above 0, so a full current window no longer fits.
    const counts = {
      previous: RATE_LIMIT_MAX_LIMIT,
      current: RATE_LIMIT_MAX_LIMIT - 1,
    };
    expect(admits(counts, position, rule, 1)).toBe(false);
    expect(admits({ ...counts, previous: 0 }, position, rule, 1)).toBe(true);
  });
});

describe('slidingWindowResult', () => {
  it('rounds the estimate up and reports what remains', () => {
    const result = slidingWindowResult(
      { previous: 10, current: 2 },
      { index: 5, elapsedMs: 250 },
      RULE,
      true,
      1,
    );
    // 10 * 0.75 + 2 = 9.5
    expect(result).toEqual({
      allowed: true,
      count: 10,
      remaining: 0,
      retryAfterMs: 0,
    });
  });

  it('never reports a negative remaining when the limit was lowered', () => {
    const result = slidingWindowResult(
      { previous: 0, current: 15 },
      { index: 5, elapsedMs: 0 },
      RULE,
      false,
      1,
    );
    expect(result.count).toBe(15);
    expect(result.remaining).toBe(0);
  });

  it('waits inside the window while the previous one decays', () => {
    // 10 previous, 5 current: one more fits once 10 * (1000 - e) / 1000 <= 4, at e = 600.
    const result = slidingWindowResult(
      { previous: 10, current: 5 },
      { index: 5, elapsedMs: 100 },
      RULE,
      false,
      1,
    );
    expect(result.retryAfterMs).toBe(500);
  });

  it('waits into the next window when the current one is full', () => {
    // Next window: 10 previous weigh <= 9 from e = 100, so 900 ms here plus 100 ms there.
    const result = slidingWindowResult(
      { previous: 3, current: 10 },
      { index: 5, elapsedMs: 100 },
      RULE,
      false,
      1,
    );
    expect(result.retryAfterMs).toBe(1_000);
  });

  it('waits two windows for a cost equal to the limit', () => {
    const result = slidingWindowResult(
      { previous: 0, current: 1 },
      { index: 5, elapsedMs: 400 },
      RULE,
      false,
      RULE.limit,
    );
    expect(result.retryAfterMs).toBe(1_600);
  });
});
