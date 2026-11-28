import { RateLimitRule } from '../rate-limit-rule.js';
import { StrictRateLimiter } from '../strict-rate-limiter.js';
import { FakeRateLimiter } from './utils/index.js';

const RULE = RateLimitRule.define({
  name: 'attempts',
  limit: 2,
  windowMs: 60_000,
});

describe('StrictRateLimiter', () => {
  it('counts in the shared limiter', async () => {
    const shared = new FakeRateLimiter();
    const strict = new StrictRateLimiter(shared);

    await strict.consume('user', RULE);
    await expect(strict.peek('user', RULE)).resolves.toMatchObject({
      count: 1,
    });
    await strict.reset('user', RULE);
    await expect(strict.peek('user', RULE)).resolves.toMatchObject({
      count: 0,
    });
  });

  it.each([
    ['consume', (limiter: StrictRateLimiter) => limiter.consume('user', RULE)],
    ['peek', (limiter: StrictRateLimiter) => limiter.peek('user', RULE)],
    ['reset', (limiter: StrictRateLimiter) => limiter.reset('user', RULE)],
  ])(
    'fails %s with the shared store instead of counting per process',
    async (_name, call) => {
      const shared = new FakeRateLimiter();
      const down = new Error('shared store down');
      shared.failWith(down);

      await expect(call(new StrictRateLimiter(shared))).rejects.toBe(down);
    },
  );
});
