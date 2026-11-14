import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { FixedClock } from '@platform/kernel/testing';
import {
  DegradingRateLimiter,
  RateLimitOperation,
  type RateLimitRule,
} from '@platform/rate-limit';
import type { Valkey } from 'iovalkey';
import {
  GenericContainer,
  Wait,
  type StartedTestContainer,
} from 'testcontainers';
import { createValkeyClient } from '../../valkey-client.js';
import { ValkeyCommandError } from '../../valkey-error.js';
import { ValkeyKeyspace } from '../../valkey-keyspace.js';
import { ValkeyRateLimiter } from '../valkey-rate-limiter.js';

/**
 * Integration tests of the rate limiter against a real Valkey, started with Testcontainers. The limiter
 * connects as a user with the ACL Terraform gives each service (`~<prefix>:* &<prefix>:*`). Without Docker
 * they are skipped, except in CI (`CI=true`). `VALKEY_INTEGRATION=off` skips them.
 */
const IMAGE = 'valkey/valkey-bundle:8.1';

function dockerAvailable(): boolean {
  if (process.env['VALKEY_INTEGRATION'] === 'off') {
    return false;
  }
  const probe = spawnSync('docker', ['info'], {
    stdio: 'ignore',
    timeout: 10_000,
  });
  if (probe.status !== 0 && process.env['CI'] === 'true') {
    throw new Error(
      'Docker is not available in CI; set VALKEY_INTEGRATION=off to skip these tests on purpose',
    );
  }
  return probe.status === 0;
}

const describeWithDocker = dockerAvailable() ? describe : describe.skip;

const PREFIX = 'identity';
const keyspace = new ValkeyKeyspace(PREFIX);
// Long enough that no key expires on the server's own clock while a test runs.
const RULE: RateLimitRule = { name: 'sign-in.ip', limit: 20, windowMs: 60_000 };
// A window boundary of the rule, so elapsed time is easy to read.
const START = new Date('2026-01-01T00:00:00.000Z');

describeWithDocker('ValkeyRateLimiter against a real server', () => {
  jest.setTimeout(60_000);

  let container: StartedTestContainer;
  let host: string;
  let port: number;
  let admin: Valkey;
  // Generated per run: the test user has a password like any ACL user, but none is written down.
  const password = randomUUID();
  const clients: Valkey[] = [];

  /** A new connection as the service user, as another instance would have. */
  function connect(): Valkey {
    const client = createValkeyClient({
      host,
      port,
      tls: false,
      username: PREFIX,
      commandTimeoutMs: 5_000,
    });
    client.options.password = password;
    clients.push(client);
    return client;
  }

  function limiter(clock = new FixedClock(START)): ValkeyRateLimiter {
    return new ValkeyRateLimiter(connect(), { keyspace, clock });
  }

  async function keys(pattern: string): Promise<string[]> {
    return (await admin.call('KEYS', [pattern])) as string[];
  }

  beforeAll(async () => {
    container = await new GenericContainer(IMAGE)
      .withExposedPorts(6379)
      .withWaitStrategy(Wait.forLogMessage(/Ready to accept connections/))
      .start();
    host = container.getHost();
    port = container.getMappedPort(6379);
    admin = createValkeyClient({ url: `redis://${host}:${port}` });
    await admin.call('ACL', [
      'SETUSER',
      PREFIX,
      'on',
      `>${password}`,
      `~${PREFIX}:*`,
      `&${PREFIX}:*`,
      '+@all',
      '-@dangerous',
    ]);
  }, 300_000);

  afterAll(async () => {
    await Promise.all(clients.map((client) => client.quit().catch(() => 0)));
    await admin?.quit().catch(() => 0);
    await container?.stop();
  });

  beforeEach(async () => {
    await admin.call('FLUSHALL', []);
  });

  it('admits exactly the limit across concurrent instances', async () => {
    const instances = Array.from({ length: 5 }, () => limiter());
    const results = await Promise.all(
      Array.from({ length: 60 }, (_, i) =>
        (instances[i % instances.length] as ValkeyRateLimiter).consume(
          '203.0.113.7',
          RULE,
        ),
      ),
    );
    expect(results.filter((r) => r.allowed)).toHaveLength(RULE.limit);
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
        (instances[i % instances.length] as ValkeyRateLimiter).consume(
          'k',
          RULE,
          1 + (i % 3),
        ),
      ),
    );
    const counted = results
      .map((r, i) => (r.allowed ? 1 + (i % 3) : 0))
      .reduce((a, b) => a + b, 0);
    expect(counted).toBeLessThanOrEqual(RULE.limit);
    expect((await instances[0]?.peek('k', RULE))?.count).toBe(counted);
  });

  it('slides the window on the clock of the caller', async () => {
    const clock = new FixedClock(START);
    const rate = limiter(clock);
    await rate.consume('k', RULE, 20);
    expect((await rate.consume('k', RULE)).allowed).toBe(false);
    // 30 % into the next window, the 20 previous weigh 14.
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
    const stored = await keys('*');
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatch(
      /^identity:ratelimit:\{sign-in\.ip:[A-Za-z0-9_-]{43}\}:60000:\d+$/,
    );
    expect(stored[0]).not.toContain('ana');
    const ttl = (await admin.call('PTTL', [stored[0] as string])) as number;
    expect(ttl).toBeGreaterThan(RULE.windowMs);
    expect(ttl).toBeLessThanOrEqual(2 * RULE.windowMs);
  });

  it('counts nothing for a rejected call', async () => {
    const rate = limiter();
    await rate.consume('k', RULE, 20);
    await rate.consume('k', RULE);
    await rate.consume('k', RULE, 5);
    const [key] = await keys('*');
    await expect(admin.call('GET', [key as string])).resolves.toBe('20');
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
    await admin.call('SCRIPT', ['FLUSH']);
    expect((await rate.consume('k', RULE)).count).toBe(2);
    await admin.call('SCRIPT', ['FLUSH']);
    expect((await rate.peek('k', RULE)).count).toBe(2);
  });

  it('degrades to a local limit when the server is unreachable', async () => {
    const unreachable = createValkeyClient({
      host,
      port: 1,
      tls: false,
      connectTimeoutMs: 200,
      commandTimeoutMs: 500,
    });
    const errors: unknown[] = [];
    const degrading = new DegradingRateLimiter({
      primary: new ValkeyRateLimiter(unreachable, { keyspace }),
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
      // `quit` would wait for a connection that never comes; drop the reconnect loop instead.
      unreachable.disconnect();
    }
    expect(results.filter((r) => r.allowed)).toHaveLength(5);
    expect(errors).toHaveLength(6);
    expect(errors[0]).toBeInstanceOf(ValkeyCommandError);
  });
});
