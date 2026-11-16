import { SystemClock } from '@platform/kernel';
import { FixedClock } from '@platform/kernel/test-utils';
import { BackoffStrategy, Deadline, RetryPolicy } from '@platform/primitives';
import { ResilienceErrorCode } from '../errors/resilience-error-code.enum.js';
import { ResilienceTimeoutError } from '../errors/resilience-timeout.error.js';
import { TimeoutScope } from '../errors/timeout-scope.enum.js';
import { ResilienceEventKind } from '../events/resilience-event-kind.enum.js';
import type { ResilienceEvent } from '../events/resilience-event.js';
import { TestPolicies, UpstreamErrors } from './utils/index.js';

const API = TestPolicies.API;

/** Esperas de los eventos de reintento, en orden. */
function retryDelays(
  events: readonly ResilienceEvent[],
): (number | undefined)[] {
  return events
    .filter((event) => event.kind === ResilienceEventKind.Retry)
    .map((event) => event.detail?.delayMs);
}

describe('ResilienceRegistry retry rule', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it.each([
    ['a declared transient failure', UpstreamErrors.declaredTransient(), 3],
    ['a 503 response', UpstreamErrors.unavailable(), 3],
    ['a permanent response', UpstreamErrors.notFound(), 1],
    ['an implementation error', new TypeError('bug'), 1],
    [
      'a permanent outer error with a transient cause',
      UpstreamErrors.notFound('wrapped', UpstreamErrors.unavailable()),
      1,
    ],
  ])('retries %s: %p attempts', async (_label, error, expectedAttempts) => {
    const registry = TestPolicies.registry();
    let attempts = 0;
    await expect(
      registry.execute(
        API,
        async () => {
          attempts += 1;
          throw error;
        },
        { idempotent: true },
      ),
    ).rejects.toBe(error);
    expect(attempts).toBe(expectedAttempts);
  });

  it('does not retry a non-idempotent call whose attempt timed out', async () => {
    jest.useFakeTimers();
    const registry = TestPolicies.registry({ timeoutMs: 50 });
    let attempts = 0;
    const outcome = registry
      .execute(API, () => {
        attempts += 1;
        return TestPolicies.NEVER();
      })
      .catch((error: unknown) => error);
    await jest.advanceTimersByTimeAsync(50);
    expect(await outcome).toBeInstanceOf(ResilienceTimeoutError);
    expect(attempts).toBe(1);
  });

  it('waits the equal-jitter backoff between attempts with the injected random source', async () => {
    jest.useFakeTimers();
    const registry = TestPolicies.registry({
      retry: {
        policy: new RetryPolicy(3, 100, 1000, BackoffStrategy.EqualJitter),
      },
    });
    const events: ResilienceEvent[] = [];
    registry.subscribe((event: ResilienceEvent) => {
      events.push(event);
    });
    const outcome = registry
      .execute(API, async () => Promise.reject(UpstreamErrors.unavailable()), {
        idempotent: true,
      })
      .catch((error: unknown) => error);
    await jest.advanceTimersByTimeAsync(75);
    await jest.advanceTimersByTimeAsync(150);
    expect(await outcome).toMatchObject({ status: 503 });
    expect(retryDelays(events)).toEqual([75, 150]);
  });

  it('bounds a Retry-After hint with maxRetryAfterMs', async () => {
    jest.useFakeTimers();
    const registry = TestPolicies.registry({
      retry: {
        policy: new RetryPolicy(2, 0, 0, BackoffStrategy.None),
        maxRetryAfterMs: 1000,
      },
    });
    const events: ResilienceEvent[] = [];
    registry.subscribe((event: ResilienceEvent) => {
      events.push(event);
    });
    let attempts = 0;
    const outcome = registry
      .execute(
        API,
        async () => {
          attempts += 1;
          throw Object.assign(new Error('later'), {
            status: 503,
            retryAfterMs: 5000,
          });
        },
        { idempotent: true },
      )
      .catch((error: unknown) => error);
    await jest.advanceTimersByTimeAsync(1000);
    expect(await outcome).toMatchObject({ status: 503 });
    expect(retryDelays(events)).toEqual([1000]);
    expect(attempts).toBe(2);
  });
});

describe('ResilienceRegistry deadlines', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('passes each attempt a child of the call deadline', async () => {
    const clock = new FixedClock();
    const registry = TestPolicies.registry({ timeoutMs: 500 }, { clock });
    const deadline = Deadline.after(2000, clock);
    let remaining = -1;
    await registry.execute(
      API,
      async (_signal, attempt) => {
        remaining = attempt.deadline.remainingMs();
        return 'ok';
      },
      { deadline },
    );
    expect(remaining).toBe(500);
  });

  it('clips the attempt deadline to a caller deadline shorter than the attempt timeout', async () => {
    const clock = new FixedClock();
    const registry = TestPolicies.registry({ timeoutMs: 500 }, { clock });
    let remaining = -1;
    await registry.execute(
      API,
      async (_signal, attempt) => {
        remaining = attempt.deadline.remainingMs();
        return 'ok';
      },
      { deadline: Deadline.after(100, clock) },
    );
    expect(remaining).toBe(100);
  });

  it('uses the nearest of the caller deadline and the policy budget', async () => {
    jest.useFakeTimers();
    const registry = TestPolicies.registry({
      totalTimeoutMs: 1000,
      timeoutMs: 2000,
    });
    const events: ResilienceEvent[] = [];
    registry.subscribe((event) => {
      events.push(event);
    });
    const outcome = registry
      .execute(API, TestPolicies.NEVER, {
        deadline: Deadline.after(10, new SystemClock()),
      })
      .catch((error: unknown) => error);
    await jest.advanceTimersByTimeAsync(10);
    expect(await outcome).toMatchObject({
      code: ResilienceErrorCode.Timeout,
      scope: TimeoutScope.Total,
    });
    expect(events).toContainEqual(
      expect.objectContaining({
        kind: ResilienceEventKind.Timeout,
        detail: { timeoutMs: 10 },
      }),
    );
  });

  it('never runs the retries past the caller deadline', async () => {
    jest.useFakeTimers();
    const registry = TestPolicies.registry({
      retry: { policy: new RetryPolicy(5, 100, 100, BackoffStrategy.None) },
    });
    let attempts = 0;
    const outcome = registry
      .execute(
        API,
        async () => {
          attempts += 1;
          throw UpstreamErrors.unavailable();
        },
        { idempotent: true, deadline: Deadline.after(150, new SystemClock()) },
      )
      .catch((error: unknown) => error);
    await jest.advanceTimersByTimeAsync(150);
    // El segundo intento falla a los 100 ms y otra espera de 100 ms ya no cabe.
    expect(await outcome).toMatchObject({ status: 503 });
    expect(attempts).toBe(2);
  });

  it('does not start a wait that would not fit before the deadline and rethrows the last error', async () => {
    const clock = new FixedClock();
    const registry = TestPolicies.registry(
      {
        retry: {
          policy: new RetryPolicy(3, 60_000, 60_000, BackoffStrategy.None),
        },
      },
      { clock },
    );
    const error = UpstreamErrors.unavailable();
    let attempts = 0;
    await expect(
      registry.execute(
        API,
        async () => {
          attempts += 1;
          throw error;
        },
        { idempotent: true, deadline: Deadline.after(1000, clock) },
      ),
    ).rejects.toBe(error);
    expect(attempts).toBe(1);
  });

  it('rejects without calling the operation when the budget is already spent', async () => {
    const registry = TestPolicies.registry();
    let called = false;
    await expect(
      registry.execute(
        API,
        async () => {
          called = true;
          return 'x';
        },
        { totalTimeoutMs: 0 },
      ),
    ).rejects.toMatchObject({
      code: ResilienceErrorCode.Timeout,
      scope: TimeoutScope.Total,
    });
    expect(called).toBe(false);
  });

  it('aborts the attempt signal when the deadline expires', async () => {
    jest.useFakeTimers();
    const registry = TestPolicies.registry({ timeoutMs: 2000 });
    let captured: AbortSignal | undefined;
    const outcome = registry
      .execute(
        API,
        (signal) => {
          captured = signal;
          return TestPolicies.NEVER();
        },
        { totalTimeoutMs: 30 },
      )
      .catch((error: unknown) => error);
    await jest.advanceTimersByTimeAsync(30);
    expect(captured?.aborted).toBe(true);
    expect(await outcome).toBeInstanceOf(ResilienceTimeoutError);
  });

  it('does not open the circuit when only the caller deadline expires', async () => {
    jest.useFakeTimers();
    const registry = TestPolicies.registry({
      timeoutMs: 2000,
      circuitBreaker: { consecutiveFailures: 1, halfOpenAfterMs: 30_000 },
    });
    const outcome = registry
      .execute(API, TestPolicies.NEVER, { totalTimeoutMs: 30 })
      .catch((error: unknown) => error);
    await jest.advanceTimersByTimeAsync(30);
    expect(await outcome).toBeInstanceOf(ResilienceTimeoutError);
    await expect(
      registry.execute(API, async () => 'still closed'),
    ).resolves.toBe('still closed');
  });
});
