import { FixedClock } from '@platform/kernel/test-utils';
import { InMemoryRateLimiter } from '../in-memory-rate-limiter.js';
import type { RateLimitRule } from '../rate-limit-rule.js';
import {
  SlidingWindowReferenceModel,
  SlidingWindowScenario,
} from './utils/index.js';

const RULE: RateLimitRule = { name: 'equivalence', limit: 3, windowMs: 1000 };
const KEY = 'user';
const START = new Date('2025-01-01T00:00:00.000Z');

const SCENARIO = new SlidingWindowScenario([
  { advanceMs: 0, cost: 1 },
  { advanceMs: 0, cost: 1 },
  { advanceMs: 0, cost: 1 },
  { advanceMs: 0, cost: 1 },
  { advanceMs: 400, cost: 1 },
  { advanceMs: 100, cost: 2 },
  { advanceMs: 300, cost: 1 },
  { advanceMs: 600, cost: 1 },
  { advanceMs: 2500, cost: 2 },
  { advanceMs: 0, cost: 1 },
  { advanceMs: 0, cost: 1 },
  { advanceMs: 900, cost: 1 },
  { advanceMs: 100, cost: 1 },
  { advanceMs: 50, cost: 3 },
]);

describe('sliding window equivalence', () => {
  it('matches the reference model on the same sequence of calls', async () => {
    const clockLimiter = new FixedClock(START);
    const clockModel = new FixedClock(START);
    const limiter = new InMemoryRateLimiter({ clock: clockLimiter });
    const model = new SlidingWindowReferenceModel(RULE, clockModel);

    const fromLimiter = await SCENARIO.run(
      (cost) => limiter.consume(KEY, RULE, cost),
      clockLimiter,
    );
    const fromModel = await SCENARIO.run(
      (cost) => model.consume(cost),
      clockModel,
    );

    expect(fromLimiter).toEqual(fromModel);
    expect(fromModel.some((result) => !result.allowed)).toBe(true);
  });
});
