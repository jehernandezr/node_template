import { FixedClock } from '@platform/kernel/testing';
import { InvalidArgumentError } from '@platform/primitives';
import { FakeRateLimiter } from '../testing/fake-rate-limiter.js';
import { DegradingRateLimiter } from './degrading-rate-limiter.js';
import { InMemoryRateLimiter } from './in-memory-rate-limiter.js';
import { RateLimitOperation, type RateLimitRule } from './rate-limit-rule.js';

const RULE: RateLimitRule = { name: 'api', limit: 10, windowMs: 60_000 };

function setup(localDivisor = 4) {
  const clock = new FixedClock();
  const primary = new FakeRateLimiter(clock);
  const onDegraded = jest.fn();
  const limiter = new DegradingRateLimiter({
    primary,
    localDivisor,
    clock,
    onDegraded,
  });
  return { clock, primary, onDegraded, limiter };
}

async function allowedCount(
  limiter: DegradingRateLimiter,
  rule: RateLimitRule,
  attempts: number,
): Promise<number> {
  let allowed = 0;
  for (let i = 0; i < attempts; i += 1) {
    if ((await limiter.consume('k', rule)).allowed) allowed += 1;
  }
  return allowed;
}

describe('DegradingRateLimiter', () => {
  it('answers with the shared limiter while it works', async () => {
    const { primary, onDegraded, limiter } = setup();
    expect(await allowedCount(limiter, RULE, 12)).toBe(10);
    expect(await limiter.peek('k', RULE)).toMatchObject({ allowed: false });
    expect(primary.callsOf(RateLimitOperation.Consume)).toHaveLength(12);
    expect(onDegraded).not.toHaveBeenCalled();
  });

  it('falls back to a local limit divided by localDivisor', async () => {
    const { primary, onDegraded, limiter } = setup(4);
    const outage = new Error('connection refused');
    primary.failWith(outage);
    expect(await allowedCount(limiter, RULE, 5)).toBe(2);
    expect(await limiter.peek('k', RULE)).toMatchObject({
      allowed: false,
      count: 2,
    });
    expect(onDegraded).toHaveBeenCalledWith(
      RateLimitOperation.Consume,
      RULE,
      outage,
    );
    expect(onDegraded).toHaveBeenCalledWith(
      RateLimitOperation.Peek,
      RULE,
      outage,
    );
  });

  it('keeps at least one unit and bounds the cost to the local limit', async () => {
    const { primary, limiter } = setup(100);
    primary.failWith(new Error('down'));
    expect(await limiter.consume('k', RULE, 7)).toMatchObject({
      allowed: true,
      count: 1,
      remaining: 0,
    });
    expect((await limiter.consume('k', RULE)).allowed).toBe(false);
  });

  it('returns to the shared limiter when it recovers', async () => {
    const { primary, limiter } = setup();
    primary.failWith(new Error('down'));
    await allowedCount(limiter, RULE, 5);
    primary.failWith();
    expect((await limiter.consume('k', RULE)).allowed).toBe(true);
  });

  it('resets both limiters and only reports a failure of the shared one', async () => {
    const { primary, onDegraded, limiter } = setup(4);
    primary.failWith(new Error('down'));
    await allowedCount(limiter, RULE, 2);
    await expect(limiter.reset('k', RULE)).resolves.toBeUndefined();
    expect(onDegraded).toHaveBeenLastCalledWith(
      RateLimitOperation.Reset,
      RULE,
      expect.any(Error),
    );
    expect(await allowedCount(limiter, RULE, 3)).toBe(2);

    primary.failWith();
    await limiter.consume('k', RULE, 10);
    await limiter.reset('k', RULE);
    expect((await limiter.consume('k', RULE)).allowed).toBe(true);
  });

  it('validates before calling the shared limiter', async () => {
    const { primary, onDegraded, limiter } = setup();
    await expect(limiter.consume('k', RULE, 11)).rejects.toBeInstanceOf(
      InvalidArgumentError,
    );
    await expect(limiter.peek('', RULE)).rejects.toBeInstanceOf(
      InvalidArgumentError,
    );
    await expect(
      limiter.reset('k', { ...RULE, windowMs: 0 }),
    ).rejects.toBeInstanceOf(InvalidArgumentError);
    expect(primary.calls).toHaveLength(0);
    expect(onDegraded).not.toHaveBeenCalled();
  });

  it('ignores a listener that throws', async () => {
    const primary = new FakeRateLimiter();
    primary.failWith(new Error('down'));
    const limiter = new DegradingRateLimiter({
      primary,
      localDivisor: 1,
      onDegraded: () => {
        throw new Error('listener bug');
      },
    });
    expect((await limiter.consume('k', RULE)).allowed).toBe(true);
  });

  it('uses the given fallback', async () => {
    const primary = new FakeRateLimiter();
    primary.failWith(new Error('down'));
    const fallback = new FakeRateLimiter();
    const limiter = new DegradingRateLimiter({
      primary,
      fallback,
      localDivisor: 2,
    });
    await limiter.consume('k', RULE);
    expect(fallback.calls).toEqual([
      {
        operation: RateLimitOperation.Consume,
        key: 'k',
        rule: { ...RULE, limit: 5 },
        cost: 1,
      },
    ]);
  });

  it.each([0, -2, 1.5, Number.NaN])(
    'rejects localDivisor %p',
    (localDivisor) => {
      expect(
        () =>
          new DegradingRateLimiter({
            primary: new InMemoryRateLimiter(),
            localDivisor,
          }),
      ).toThrow(InvalidArgumentError);
    },
  );
});
