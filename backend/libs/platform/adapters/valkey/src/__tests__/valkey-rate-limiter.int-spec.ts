import { ContainerRuntime, FixedClock } from '@platform/kernel/test-utils';
import {
  DegradingRateLimiter,
  RateLimitOperation,
  SlidingWindow,
  type RateLimitRule,
} from '@platform/rate-limit';
import {
  runRateLimiterContract,
  SlidingWindowReferenceModel,
  SlidingWindowScenario,
} from '@platform/rate-limit/test-utils';
import { ValkeyClientFactory } from '../valkey-client-factory.js';
import { ValkeyCommandError } from '../valkey-command.error.js';
import { ValkeyConnectionResolver } from '../valkey-connection-resolver.js';
import { ValkeyKeyspace } from '../valkey-keyspace.js';
import { ValkeyRateLimiter } from '../valkey-rate-limiter.js';
import { valkeyConfigSchema } from '../valkey.config.js';
import { ValkeyExecutors, ValkeyTestServer } from './utils/index.js';

/**
 * Limiter tests against a real Valkey. Without Docker they are skipped; with
 * `INTEGRATION_TESTS=require` missing Docker is an error.
 */
jest.setTimeout(60_000);

const PREFIX = 'identity';
const keyspace = new ValkeyKeyspace(PREFIX);
// Long enough that no key expires on the server clock while a test runs.
const RULE: RateLimitRule = { name: 'sign-in.ip', limit: 20, windowMs: 60_000 };
// One window edge of the rule, to make the elapsed time easy to read.
const START = new Date('2026-01-01T00:00:00.000Z');

const runtime = new ContainerRuntime(process.env);

runtime.describeIfAvailable('ValkeyRateLimiter against a real server', () => {
  const server = new ValkeyTestServer(PREFIX);

  function limiter(clock = new FixedClock(START)): ValkeyRateLimiter {
    return new ValkeyRateLimiter(
      ValkeyExecutors.over(server.connect()),
      keyspace,
      clock,
    );
  }

  beforeAll(() => server.start(), 300_000);
  afterAll(() => server.stop());
  beforeEach(() => server.flush());

  runRateLimiterContract('ValkeyRateLimiter', (clock) => limiter(clock));

  describe('Lua script and SlidingWindow', () => {
    const rule: RateLimitRule = {
      name: 'equivalence',
      limit: 3,
      windowMs: 1000,
    };
    const scenario = new SlidingWindowScenario([
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

    it('gives the same result as the reference model for the same sequence', async () => {
      const clockValkey = new FixedClock(START);
      const clockModel = new FixedClock(START);
      const valkey = limiter(clockValkey);
      const model = new SlidingWindowReferenceModel(rule, clockModel);

      const fromValkey = await scenario.run(
        (cost) => valkey.consume('user', rule, cost),
        clockValkey,
      );
      const fromModel = await scenario.run(
        (cost) => model.consume(cost),
        clockModel,
      );

      expect(fromValkey).toEqual(fromModel);
      expect(fromModel.some((result) => !result.allowed)).toBe(true);
    });

    // Three calls at the start of the window and then a `peek` at each edge: the
    // counts of each row are the ones the server must have at that instant.
    it.each([
      [0, 0, 3, false],
      [333, 0, 3, false],
      [334, 0, 3, false],
      [999, 0, 3, false],
      [1000, 3, 0, false],
      [1333, 3, 0, false],
      [1334, 3, 0, true],
    ])(
      'decides like SlidingWindow.admits %p ms after a full window (previous %p, current %p)',
      async (elapsedMs, previous, current, allowed) => {
        const clock = new FixedClock(START);
        const valkey = limiter(clock);
        await valkey.consume('k', rule, 3);
        clock.set(new Date(START.getTime() + elapsedMs));
        const position = SlidingWindow.position(
          clock.now().getTime(),
          rule.windowMs,
        );

        const result = await valkey.peek('k', rule);

        expect(
          SlidingWindow.admits({ previous, current }, position, rule, 1),
        ).toBe(allowed);
        expect(result.allowed).toBe(allowed);
      },
    );
  });

  it('admits exactly the limit across concurrent instances', async () => {
    const instances = Array.from({ length: 5 }, () => limiter());
    const results = await Promise.all(
      Array.from({ length: 60 }, (_, i) =>
        instances[i % instances.length]?.consume('203.0.113.7', RULE),
      ),
    );
    expect(results.filter((r) => r?.allowed)).toHaveLength(RULE.limit);
    expect(await instances[0]?.peek('203.0.113.7', RULE)).toMatchObject({
      allowed: false,
      count: RULE.limit,
      remaining: 0,
    });
  });

  it('never goes over the limit with concurrent costs', async () => {
    const instances = Array.from({ length: 4 }, () => limiter());
    const results = await Promise.all(
      Array.from({ length: 40 }, (_, i) =>
        instances[i % instances.length]?.consume('k', RULE, 1 + (i % 3)),
      ),
    );
    const counted = results
      .map((r, i) => (r?.allowed ? 1 + (i % 3) : 0))
      .reduce((a, b) => a + b, 0);
    expect(counted).toBeLessThanOrEqual(RULE.limit);
    expect((await instances[0]?.peek('k', RULE))?.count).toBe(counted);
  });

  it('slides the window on the clock of the caller', async () => {
    const clock = new FixedClock(START);
    const rate = limiter(clock);
    await rate.consume('k', RULE, 20);
    expect((await rate.consume('k', RULE)).allowed).toBe(false);
    // At 30 % of the next window, the previous 20 weigh 14.
    clock.advance(78_000);
    expect(await rate.peek('k', RULE)).toEqual({
      allowed: true,
      count: 14,
      remaining: 6,
      retryAfterMs: 0,
    });
    expect((await rate.consume('k', RULE, 6)).allowed).toBe(true);
    const rejected = await rate.consume('k', RULE);
    expect(rejected.allowed).toBe(false);
    clock.advance(rejected.retryAfterMs - 1);
    expect((await rate.peek('k', RULE)).allowed).toBe(false);
    clock.advance(1);
    expect((await rate.consume('k', RULE)).allowed).toBe(true);
  });

  it('stores hashed keys that expire after two windows', async () => {
    await limiter().consume('ana@example.com', RULE);
    const stored = await server.keys('*');
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatch(
      /^identity:ratelimit:\{sign-in\.ip:[A-Za-z0-9_-]{43}\}:60000:\d+$/,
    );
    expect(stored[0]).not.toContain('ana');
    const ttl = Number(await server.superuser.call('PTTL', stored[0] ?? ''));
    expect(ttl).toBeGreaterThan(RULE.windowMs);
    expect(ttl).toBeLessThanOrEqual(2 * RULE.windowMs);
  });

  it('counts nothing for a rejected call', async () => {
    const rate = limiter();
    await rate.consume('k', RULE, 20);
    await rate.consume('k', RULE);
    await rate.consume('k', RULE, 5);
    const [key] = await server.keys('*');
    await expect(server.superuser.call('GET', key ?? '')).resolves.toBe('20');
  });

  it('resets one key and rule', async () => {
    const rate = limiter();
    await rate.consume('k', RULE, 20);
    await rate.consume('other', RULE, 20);
    await rate.reset('k', RULE);
    expect((await rate.consume('k', RULE)).allowed).toBe(true);
    expect((await rate.consume('other', RULE)).allowed).toBe(false);
  });

  it('reloads the scripts after the server forgets them', async () => {
    const rate = limiter();
    await rate.consume('k', RULE);
    await server.superuser.call('SCRIPT', 'FLUSH');
    expect((await rate.consume('k', RULE)).count).toBe(2);
    await server.superuser.call('SCRIPT', 'FLUSH');
    expect((await rate.peek('k', RULE)).count).toBe(2);
  });

  it('degrades to a local limit when the server is unreachable', async () => {
    const unreachable = await new ValkeyClientFactory(
      new ValkeyConnectionResolver(),
      valkeyConfigSchema.parse({ VALKEY_HOST: server.host, VALKEY_PORT: '1' }),
      { connectTimeoutMs: 200, commandTimeoutMs: 500 },
      undefined,
    ).create();
    const errors: unknown[] = [];
    const degrading = new DegradingRateLimiter({
      primary: new ValkeyRateLimiter(
        ValkeyExecutors.over(unreachable),
        keyspace,
        new FixedClock(START),
      ),
      localDivisor: 4,
      onDegraded: (operation, _rule, error) => {
        expect(operation).toBe(RateLimitOperation.Consume);
        errors.push(error);
      },
    });
    const results = [];
    try {
      for (let i = 0; i < 6; i += 1) {
        results.push(await degrading.consume('k', RULE));
      }
    } finally {
      // `quit` would wait for a connection that never arrives; the reconnection loop is cut.
      unreachable.disconnect();
    }
    expect(results.filter((r) => r.allowed)).toHaveLength(5);
    expect(errors).toHaveLength(6);
    expect(errors[0]).toBeInstanceOf(ValkeyCommandError);
  });
});
