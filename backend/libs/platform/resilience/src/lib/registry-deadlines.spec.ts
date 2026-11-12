import { PlatformError } from '@platform/kernel';
import { FixedClock } from '@platform/kernel/testing';
import {
  classifyFailure,
  Deadline,
  FailureKind,
  InvalidArgumentError,
} from '@platform/primitives';
import { TimeoutStrategy } from './config.js';
import {
  BulkheadFullError,
  CircuitOpenError,
  ResilienceTimeoutError,
  TimeoutScope,
  UnknownPolicyError,
} from './errors.js';
import type { ResilienceEvent } from './events.js';
import { ResilienceEventKind, ResiliencePolicyName } from './policy-name.js';
import {
  ResilienceRegistry,
  type ResilienceAttempt,
  type ResilienceOverrides,
} from './registry.js';

const never = (): Promise<never> => new Promise<never>(() => undefined);

const systemClock = { now: () => new Date() };

function transientError(extra: Record<string, unknown> = {}): Error {
  return Object.assign(new Error('upstream down'), { status: 503, ...extra });
}

function registryWith(
  overrides: ResilienceOverrides[ResiliencePolicyName.ExternalApi],
  options: ConstructorParameters<typeof ResilienceRegistry>[1] = {},
): ResilienceRegistry {
  return new ResilienceRegistry(
    { [ResiliencePolicyName.ExternalApi]: overrides },
    options,
  );
}

function rejectOnAbort(signal: AbortSignal): Promise<never> {
  return new Promise<never>((_resolve, reject) => {
    signal.addEventListener('abort', () => reject(new Error('aborted')));
  });
}

describe('ResilienceRegistry retry rule (primitives classifyFailure)', () => {
  it('retries a failure that declares failureKind transient', async () => {
    const registry = registryWith({
      timeoutMs: 50,
      retry: { maxAttempts: 3, initialDelayMs: 1, maxDelayMs: 2 },
    });
    let attempts = 0;

    await expect(
      registry.execute(
        ResiliencePolicyName.ExternalApi,
        async () => {
          attempts += 1;
          if (attempts === 1) {
            throw Object.assign(new Error('flaky'), {
              failureKind: FailureKind.Transient,
            });
          }
          return 'ok';
        },
        { idempotent: true },
      ),
    ).resolves.toBe('ok');
    expect(attempts).toBe(2);
  });

  it('does not retry when the outer error says retryable false, even with a transient cause', async () => {
    const registry = registryWith({
      timeoutMs: 50,
      retry: { maxAttempts: 3, initialDelayMs: 1, maxDelayMs: 2 },
    });
    let attempts = 0;
    const error = Object.assign(new Error('final'), {
      retryable: false,
      cause: { code: 'ECONNRESET' },
    });

    await expect(
      registry.execute(
        ResiliencePolicyName.ExternalApi,
        async () => {
          attempts += 1;
          throw error;
        },
        { idempotent: true },
      ),
    ).rejects.toBe(error);
    expect(attempts).toBe(1);
  });

  it('does not retry implementation errors (protocol violations)', async () => {
    const registry = registryWith({
      timeoutMs: 50,
      retry: { maxAttempts: 3, initialDelayMs: 1, maxDelayMs: 2 },
    });
    let attempts = 0;

    await expect(
      registry.execute(
        ResiliencePolicyName.ExternalApi,
        async () => {
          attempts += 1;
          throw new TypeError('bug');
        },
        { idempotent: true },
      ),
    ).rejects.toThrow(TypeError);
    expect(attempts).toBe(1);
  });

  it('retries an idempotent call whose attempt timed out', async () => {
    const registry = registryWith({
      timeoutMs: 20,
      totalTimeoutMs: 1_000,
      retry: { maxAttempts: 2, initialDelayMs: 1, maxDelayMs: 2 },
      circuitBreaker: undefined,
    });
    let attempts = 0;

    await expect(
      registry.execute(
        ResiliencePolicyName.ExternalApi,
        async () => {
          attempts += 1;
          return attempts === 1 ? never() : 'second';
        },
        { idempotent: true },
      ),
    ).resolves.toBe('second');
    expect(attempts).toBe(2);
  });

  it('does not retry a non-idempotent call whose attempt timed out', async () => {
    const registry = registryWith({
      timeoutMs: 20,
      retry: { maxAttempts: 3, initialDelayMs: 1, maxDelayMs: 2 },
    });
    let attempts = 0;

    const error = await registry
      .execute(ResiliencePolicyName.ExternalApi, async () => {
        attempts += 1;
        return never();
      })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ResilienceTimeoutError);
    expect(attempts).toBe(1);
  });

  it('uses the primitives backoff with equal jitter and the injected random source', async () => {
    const registry = registryWith(
      {
        timeoutMs: 50,
        retry: { maxAttempts: 3, initialDelayMs: 4, maxDelayMs: 100 },
      },
      { random: () => 0 },
    );
    const events: ResilienceEvent[] = [];
    registry.onEvent((event) => {
      events.push(event);
    });

    await registry
      .execute(
        ResiliencePolicyName.ExternalApi,
        async () => {
          throw transientError();
        },
        { idempotent: true },
      )
      .catch(() => undefined);

    const delays = events
      .filter((event) => event.kind === ResilienceEventKind.Retry)
      .map((event) => event.detail?.delayMs);
    // Equal jitter with random 0 waits half the ceiling: 4 / 2, then 8 / 2.
    expect(delays).toEqual([2, 4]);
  });

  it('bounds a Retry-After hint with maxRetryAfterMs', async () => {
    const registry = registryWith({
      timeoutMs: 50,
      retry: {
        maxAttempts: 2,
        initialDelayMs: 1,
        maxDelayMs: 2,
        maxRetryAfterMs: 20,
      },
    });
    const events: ResilienceEvent[] = [];
    registry.onEvent((event) => {
      events.push(event);
    });
    let attempts = 0;
    const started = Date.now();

    await expect(
      registry.execute(
        ResiliencePolicyName.ExternalApi,
        async () => {
          attempts += 1;
          if (attempts === 1) {
            throw transientError({ headers: { 'retry-after': '3600' } });
          }
          return 'ok';
        },
        { idempotent: true },
      ),
    ).resolves.toBe('ok');
    expect(Date.now() - started).toBeLessThan(1_000);
    const retry = events.find((e) => e.kind === ResilienceEventKind.Retry);
    expect(retry?.detail?.delayMs).toBe(20);
  });
});

describe('ResilienceRegistry deadlines', () => {
  it('passes each attempt a child of the call deadline', async () => {
    const clock = new FixedClock();
    const registry = registryWith(
      {
        timeoutMs: 50,
        totalTimeoutMs: undefined,
        retry: { maxAttempts: 3, initialDelayMs: 1, maxDelayMs: 2 },
      },
      { clock },
    );
    const deadline = Deadline.after(1_000, clock);
    const seen: ResilienceAttempt[] = [];

    await registry.execute(
      ResiliencePolicyName.ExternalApi,
      async (_signal, attempt) => {
        seen.push(attempt);
        if (seen.length < 3) {
          throw transientError();
        }
        return 'ok';
      },
      { idempotent: true, deadline },
    );

    expect(seen.map((attempt) => attempt.number)).toEqual([1, 2, 3]);
    for (const attempt of seen) {
      expect(attempt.deadline.atMs).toBe(clock.now().getTime() + 50);
      expect(attempt.deadline.atMs).toBeLessThanOrEqual(deadline.atMs);
    }
  });

  it('clips the attempt deadline to a caller deadline shorter than the attempt timeout', async () => {
    const clock = new FixedClock();
    const registry = registryWith({ timeoutMs: 5_000 }, { clock });
    const deadline = Deadline.after(30, clock);

    const attempt = await registry.execute(
      ResiliencePolicyName.ExternalApi,
      async (_signal, current) => current,
      { deadline },
    );

    expect(attempt.deadline.atMs).toBe(deadline.atMs);
  });

  it('uses the nearest of the caller deadline and the policy budget', async () => {
    const clock = new FixedClock();
    const registry = registryWith(
      { timeoutMs: 5_000, totalTimeoutMs: 100 },
      { clock },
    );

    const attempt = await registry.execute(
      ResiliencePolicyName.ExternalApi,
      async (_signal, current) => current,
      { deadline: Deadline.after(60_000, clock) },
    );

    expect(attempt.deadline.atMs).toBe(clock.now().getTime() + 100);
  });

  it('never runs the retries past the caller deadline', async () => {
    const registry = registryWith({
      timeoutMs: 20,
      totalTimeoutMs: undefined,
      retry: { maxAttempts: 50, initialDelayMs: 5, maxDelayMs: 5 },
      circuitBreaker: undefined,
    });
    const started = Date.now();
    let attempts = 0;

    const error = await registry
      .execute(
        ResiliencePolicyName.ExternalApi,
        async () => {
          attempts += 1;
          return never();
        },
        { idempotent: true, deadline: Deadline.after(80, systemClock) },
      )
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ResilienceTimeoutError);
    expect(attempts).toBeLessThan(50);
    expect(Date.now() - started).toBeLessThan(400);
  });

  it('does not start a wait that would not fit before the deadline and rethrows the last error', async () => {
    const registry = registryWith({
      timeoutMs: 50,
      totalTimeoutMs: undefined,
      retry: { maxAttempts: 3, initialDelayMs: 1, maxDelayMs: 2 },
    });
    const failure = transientError({ retryAfterMs: 5_000 });
    let attempts = 0;
    const started = Date.now();

    await expect(
      registry.execute(
        ResiliencePolicyName.ExternalApi,
        async () => {
          attempts += 1;
          throw failure;
        },
        { idempotent: true, deadline: Deadline.after(1_000, systemClock) },
      ),
    ).rejects.toBe(failure);
    expect(attempts).toBe(1);
    expect(Date.now() - started).toBeLessThan(500);
  });

  it('rejects without calling the operation when the deadline already expired', async () => {
    const clock = new FixedClock();
    const registry = registryWith({ timeoutMs: 50 }, { clock });
    const fn = jest.fn(async () => 'never');

    const error = await registry
      .execute(ResiliencePolicyName.ExternalApi, fn, {
        deadline: Deadline.after(0, clock),
      })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ResilienceTimeoutError);
    expect((error as ResilienceTimeoutError).scope).toBe(TimeoutScope.Total);
    expect(fn).not.toHaveBeenCalled();
  });

  it('cancels a pending retry wait as soon as the caller aborts', async () => {
    const registry = registryWith({
      timeoutMs: 50,
      totalTimeoutMs: undefined,
      retry: { maxAttempts: 3, initialDelayMs: 10_000, maxDelayMs: 10_000 },
    });
    const controller = new AbortController();
    const reason = new Error('client left');
    setTimeout(() => controller.abort(reason), 20);
    const started = Date.now();

    await expect(
      registry.execute(
        ResiliencePolicyName.ExternalApi,
        async () => {
          throw transientError();
        },
        { idempotent: true, signal: controller.signal },
      ),
    ).rejects.toBe(reason);
    expect(Date.now() - started).toBeLessThan(1_000);
  });

  it('aborts the attempt signal when the deadline expires', async () => {
    const registry = registryWith({
      timeoutMs: 5_000,
      totalTimeoutMs: undefined,
      timeoutStrategy: TimeoutStrategy.Cooperative,
    });
    let seen: AbortSignal | undefined;

    const error = await registry
      .execute(
        ResiliencePolicyName.ExternalApi,
        (signal) => {
          seen = signal;
          return rejectOnAbort(signal);
        },
        { deadline: Deadline.after(20, systemClock) },
      )
      .catch((e: unknown) => e);

    expect(seen?.aborted).toBe(true);
    expect(error).toBeInstanceOf(ResilienceTimeoutError);
    expect((error as ResilienceTimeoutError).scope).toBe(TimeoutScope.Total);
  });

  it('reports a cooperative attempt timeout as ResilienceTimeoutError', async () => {
    const registry = registryWith({
      timeoutMs: 20,
      timeoutStrategy: TimeoutStrategy.Cooperative,
    });

    const error = await registry
      .execute(ResiliencePolicyName.ExternalApi, rejectOnAbort)
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ResilienceTimeoutError);
    expect((error as ResilienceTimeoutError).scope).toBe(TimeoutScope.Attempt);
    expect(classifyFailure(error)).toBe(FailureKind.Timeout);
  });

  it('does not open the circuit when only the caller deadline expires', async () => {
    const registry = registryWith({
      timeoutMs: 5_000,
      totalTimeoutMs: undefined,
      circuitBreaker: { consecutiveFailures: 1, halfOpenAfterMs: 10_000 },
    });

    await registry
      .execute(ResiliencePolicyName.ExternalApi, rejectOnAbort, {
        deadline: Deadline.after(10, systemClock),
      })
      .catch(() => undefined);

    await expect(
      registry.execute(ResiliencePolicyName.ExternalApi, async () => 'ok'),
    ).resolves.toBe('ok');
  });
});

describe('ResilienceRegistry errors', () => {
  it('rejects an unknown policy with UnknownPolicyError', async () => {
    const registry = new ResilienceRegistry();
    const error = await registry
      .execute('nope' as ResiliencePolicyName, async () => 1)
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(UnknownPolicyError);
    expect(classifyFailure(error)).toBe(FailureKind.ProtocolViolation);
  });

  it('validates the merged policies when built', () => {
    expect(() => registryWith({ timeoutMs: 0 })).toThrow(InvalidArgumentError);
    expect(() =>
      registryWith({
        timeoutMs: 10,
        retry: { maxAttempts: 0, initialDelayMs: 1, maxDelayMs: 2 },
      }),
    ).toThrow(InvalidArgumentError);
    expect(() =>
      registryWith({
        timeoutMs: 10,
        retry: { maxAttempts: 2, initialDelayMs: 10, maxDelayMs: 1 },
      }),
    ).toThrow(InvalidArgumentError);
  });

  it('raises a transient, retryable CircuitOpenError', async () => {
    const registry = registryWith({
      timeoutMs: 50,
      circuitBreaker: { consecutiveFailures: 1, halfOpenAfterMs: 10_000 },
    });
    await registry
      .execute(ResiliencePolicyName.ExternalApi, async () => {
        throw transientError();
      })
      .catch(() => undefined);

    const error = await registry
      .execute(ResiliencePolicyName.ExternalApi, async () => 'ok')
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(CircuitOpenError);
    expect(error).toBeInstanceOf(PlatformError);
    expect((error as CircuitOpenError).retryable).toBe(true);
    expect(classifyFailure(error)).toBe(FailureKind.Transient);
  });

  it('does not retry its own open circuit', async () => {
    const registry = registryWith({
      timeoutMs: 50,
      retry: { maxAttempts: 5, initialDelayMs: 1, maxDelayMs: 2 },
      circuitBreaker: { consecutiveFailures: 1, halfOpenAfterMs: 10_000 },
    });
    const events: ResilienceEvent[] = [];
    registry.onEvent((event) => {
      events.push(event);
    });
    let attempts = 0;

    const error = await registry
      .execute(
        ResiliencePolicyName.ExternalApi,
        async () => {
          attempts += 1;
          throw transientError();
        },
        { idempotent: true },
      )
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(CircuitOpenError);
    expect(attempts).toBe(1);
    expect(
      events.filter((event) => event.kind === ResilienceEventKind.Retry),
    ).toHaveLength(1);
  });

  it('raises BulkheadFullError when there is no slot or queue', async () => {
    const registry = registryWith({
      timeoutMs: 1_000,
      bulkhead: { limit: 1, queue: 0 },
    });
    let release: () => void = () => undefined;
    const first = registry.execute(
      ResiliencePolicyName.ExternalApi,
      () =>
        new Promise<string>((resolve) => {
          release = () => resolve('first');
        }),
    );

    const error = await registry
      .execute(ResiliencePolicyName.ExternalApi, async () => 'second')
      .catch((e: unknown) => e);
    release();

    expect(error).toBeInstanceOf(BulkheadFullError);
    expect(classifyFailure(error)).toBe(FailureKind.Transient);
    await expect(first).resolves.toBe('first');
  });

  it('timestamps events with the injected clock', async () => {
    const clock = new FixedClock(new Date('2030-01-01T00:00:00.000Z'));
    const registry = registryWith(
      {
        timeoutMs: 50,
        retry: { maxAttempts: 2, initialDelayMs: 1, maxDelayMs: 2 },
      },
      { clock },
    );
    const events: ResilienceEvent[] = [];
    registry.onEvent((event) => {
      events.push(event);
    });

    await registry
      .execute(
        ResiliencePolicyName.ExternalApi,
        async () => {
          throw transientError();
        },
        { idempotent: true },
      )
      .catch(() => undefined);

    expect(events.length).toBeGreaterThan(0);
    for (const event of events) {
      expect(event.at).toBe(clock.now().getTime());
    }
  });
});
