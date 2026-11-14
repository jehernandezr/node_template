import { FixedClock } from '@platform/kernel/test-utils';
import { BackoffStrategy, RetryPolicy } from '@platform/primitives';
import { BulkheadFullError } from '../errors/bulkhead-full.error.js';
import { CircuitOpenError } from '../errors/circuit-open.error.js';
import { InvalidPolicyError } from '../errors/invalid-policy.error.js';
import { ResilienceErrorCode } from '../errors/resilience-error-code.enum.js';
import { ResilienceTimeoutError } from '../errors/resilience-timeout.error.js';
import { UnknownPolicyError } from '../errors/unknown-policy.error.js';
import { ResilienceEventKind } from '../events/resilience-event-kind.enum.js';
import { TimeoutScope } from '../errors/timeout-scope.enum.js';
import type { ResilienceEvent } from '../events/resilience-event.js';
import { PolicyName } from '../policy/policy-name.js';
import { ResilienceRegistry } from '../resilience-registry.js';
import {
  Deferred,
  FlakyOperation,
  Flush,
  TestPolicies,
  UpstreamErrors,
} from './utils/index.js';

const API = TestPolicies.API;

describe('ResilienceRegistry', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('retries transient errors of an idempotent call until success', async () => {
    const registry = TestPolicies.registry();
    const flaky = new FlakyOperation(2, UpstreamErrors.unavailable, 'done');
    const result = await registry.execute(API, () => flaky.run(), {
      idempotent: true,
    });
    expect(result).toBe('done');
    expect(flaky.calls).toBe(3);
  });

  it('does not retry a non-idempotent call by default', async () => {
    const registry = TestPolicies.registry();
    const error = UpstreamErrors.unavailable();
    let attempts = 0;
    await expect(
      registry.execute(API, async () => {
        attempts += 1;
        throw error;
      }),
    ).rejects.toBe(error);
    expect(attempts).toBe(1);
  });

  it('does not retry non-transient errors of an idempotent call', async () => {
    const registry = TestPolicies.registry();
    const error = UpstreamErrors.notFound();
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
    expect(attempts).toBe(1);
  });

  it('gives up after maxAttempts total calls', async () => {
    const registry = TestPolicies.registry();
    let attempts = 0;
    await expect(
      registry.execute(
        API,
        async () => {
          attempts += 1;
          throw UpstreamErrors.unavailable();
        },
        { idempotent: true },
      ),
    ).rejects.toMatchObject({ status: 503 });
    expect(attempts).toBe(3);
  });

  it('retries a transient error found in the cause chain', async () => {
    const registry = TestPolicies.registry();
    const flaky = new FlakyOperation(
      1,
      () => new Error('wrapped', { cause: UpstreamErrors.unavailable() }),
      'recovered',
    );
    const result = await registry.execute(API, () => flaky.run(), {
      idempotent: true,
    });
    expect(result).toBe('recovered');
  });

  it('honors Retry-After as the minimum delay before the next attempt', async () => {
    jest.useFakeTimers();
    const registry = TestPolicies.registry({
      retry: { policy: new RetryPolicy(2, 0, 0, BackoffStrategy.None) },
    });
    const events: ResilienceEvent[] = [];
    registry.subscribe((event) => {
      events.push(event);
    });
    const flaky = new FlakyOperation(
      1,
      () =>
        Object.assign(new Error('slow down'), {
          status: 429,
          retryAfterMs: 2000,
        }),
      'ok',
    );
    const outcome = registry.execute(API, () => flaky.run(), {
      idempotent: true,
    });
    await jest.advanceTimersByTimeAsync(1999);
    expect(flaky.calls).toBe(1);
    await jest.advanceTimersByTimeAsync(1);
    await expect(outcome).resolves.toBe('ok');
    expect(events).toContainEqual(
      expect.objectContaining({
        kind: ResilienceEventKind.Retry,
        detail: expect.objectContaining({ delayMs: 2000 }),
      }),
    );
  });

  it('opens the circuit after N failures and maps to CircuitOpen with retryAfterMs', async () => {
    const registry = TestPolicies.registry({
      circuitBreaker: { consecutiveFailures: 2, halfOpenAfterMs: 30_000 },
    });
    const operation = async (): Promise<never> => {
      throw UpstreamErrors.unavailable();
    };
    await expect(registry.execute(API, operation)).rejects.toMatchObject({
      status: 503,
    });
    await expect(registry.execute(API, operation)).rejects.toMatchObject({
      status: 503,
    });
    const rejected = registry.execute(API, async () => 'never runs');
    await expect(rejected).rejects.toMatchObject({
      code: ResilienceErrorCode.CircuitOpen,
      retryAfterMs: 30_000,
    });
    await expect(rejected).rejects.toBeInstanceOf(CircuitOpenError);
  });

  it('half-opens the circuit after halfOpenAfterMs of the injected clock and closes it on success', async () => {
    const clock = new FixedClock();
    const registry = TestPolicies.registry(
      { circuitBreaker: { consecutiveFailures: 1, halfOpenAfterMs: 30 } },
      { clock },
    );
    const events: ResilienceEvent[] = [];
    registry.subscribe((event) => {
      events.push(event);
    });
    await expect(
      registry.execute(API, async () =>
        Promise.reject(UpstreamErrors.unavailable()),
      ),
    ).rejects.toBeDefined();
    await expect(
      registry.execute(API, async () => 'blocked'),
    ).rejects.toBeInstanceOf(CircuitOpenError);
    clock.advance(30);
    await expect(registry.execute(API, async () => 'trial')).resolves.toBe(
      'trial',
    );
    expect(events.map((event) => event.kind)).toEqual(
      expect.arrayContaining([
        ResilienceEventKind.Break,
        ResilienceEventKind.HalfOpen,
        ResilienceEventKind.Reset,
      ]),
    );
  });

  it('keeps a separate breaker per dependencyKey', async () => {
    const registry = TestPolicies.registry({
      circuitBreaker: { consecutiveFailures: 1, halfOpenAfterMs: 30_000 },
    });
    await expect(
      registry.execute(
        API,
        async () => Promise.reject(UpstreamErrors.unavailable()),
        {
          dependencyKey: 'a',
        },
      ),
    ).rejects.toBeDefined();
    await expect(
      registry.execute(API, async () => 'b works', { dependencyKey: 'b' }),
    ).resolves.toBe('b works');
    await expect(
      registry.execute(API, async () => 'a blocked', { dependencyKey: 'a' }),
    ).rejects.toBeInstanceOf(CircuitOpenError);
  });

  it('does not open the circuit on non-transient errors', async () => {
    const registry = TestPolicies.registry({
      circuitBreaker: { consecutiveFailures: 1, halfOpenAfterMs: 30_000 },
    });
    const bad = (): Promise<never> => Promise.reject(new Error('bad input'));
    await expect(registry.execute(API, bad)).rejects.toThrow('bad input');
    await expect(registry.execute(API, bad)).rejects.toThrow('bad input');
    await expect(registry.execute(API, async () => 'still open')).resolves.toBe(
      'still open',
    );
  });

  it('maps a slow attempt to Timeout', async () => {
    jest.useFakeTimers();
    const registry = TestPolicies.registry({ timeoutMs: 50 });
    const outcome = registry
      .execute(API, TestPolicies.NEVER)
      .catch((error: unknown) => error);
    await jest.advanceTimersByTimeAsync(50);
    expect(await outcome).toMatchObject({
      code: ResilienceErrorCode.Timeout,
      scope: TimeoutScope.Attempt,
    });
    expect(await outcome).toBeInstanceOf(ResilienceTimeoutError);
  });

  it('retries an idempotent attempt that timed out until it runs out of attempts', async () => {
    jest.useFakeTimers();
    const registry = TestPolicies.registry({ timeoutMs: 50 });
    let attempts = 0;
    const outcome = registry
      .execute(
        API,
        () => {
          attempts += 1;
          return TestPolicies.NEVER();
        },
        { idempotent: true },
      )
      .catch((error: unknown) => error);
    // Cada reintento sin espera cuesta 1 ms de reloj: tres intentos de 50 ms caben en 200 ms.
    await jest.advanceTimersByTimeAsync(200);
    expect(await outcome).toMatchObject({
      code: ResilienceErrorCode.Timeout,
    });
    expect(attempts).toBe(3);
  });

  it('enforces the total time budget across retries and maps it to Timeout', async () => {
    jest.useFakeTimers();
    const registry = TestPolicies.registry();
    const events: ResilienceEvent[] = [];
    registry.subscribe((event) => {
      events.push(event);
    });
    const outcome = registry
      .execute(API, TestPolicies.NEVER, {
        idempotent: true,
        totalTimeoutMs: 30,
      })
      .catch((error: unknown) => error);
    await jest.advanceTimersByTimeAsync(30);
    expect(await outcome).toMatchObject({
      code: ResilienceErrorCode.Timeout,
    });
    expect(events).toContainEqual(
      expect.objectContaining({
        kind: ResilienceEventKind.Timeout,
        detail: expect.objectContaining({ timeoutMs: 30 }),
      }),
    );
  });

  it('rejects with the caller reason when the signal aborts mid-call', async () => {
    const registry = TestPolicies.registry();
    const controller = new AbortController();
    const outcome = registry.execute(API, TestPolicies.NEVER, {
      signal: controller.signal,
    });
    controller.abort(new Error('caller left'));
    await expect(outcome).rejects.toThrow('caller left');
  });

  it('stops retrying and cancels the wait when the caller aborts', async () => {
    jest.useFakeTimers();
    const registry = TestPolicies.registry({
      retry: { policy: new RetryPolicy(3, 1000, 1000, BackoffStrategy.None) },
    });
    const controller = new AbortController();
    let attempts = 0;
    const outcome = registry.execute(
      API,
      async () => {
        attempts += 1;
        throw UpstreamErrors.unavailable();
      },
      { idempotent: true, signal: controller.signal },
    );
    await jest.advanceTimersByTimeAsync(0);
    controller.abort(new Error('stop'));
    await expect(outcome).rejects.toThrow('stop');
    expect(attempts).toBe(1);
  });

  it('rejects immediately when the signal is already aborted', async () => {
    const registry = TestPolicies.registry();
    const controller = new AbortController();
    controller.abort(new Error('too late'));
    let called = false;
    await expect(
      registry.execute(
        API,
        async () => {
          called = true;
          return 'x';
        },
        { signal: controller.signal },
      ),
    ).rejects.toThrow('too late');
    expect(called).toBe(false);
  });

  it('passes an abort signal to the operation and aborts it on return by default', async () => {
    const registry = TestPolicies.registry();
    let captured: AbortSignal | undefined;
    await registry.execute(API, async (signal) => {
      captured = signal;
      return 'done';
    });
    expect(captured?.aborted).toBe(true);
  });

  it('keeps the signal alive after return when abortOnReturn is false', async () => {
    const registry = TestPolicies.registry({ abortOnReturn: false });
    let captured: AbortSignal | undefined;
    await registry.execute(API, async (signal) => {
      captured = signal;
      return 'stream';
    });
    expect(captured?.aborted).toBe(false);
  });

  it('emits retry and break events with error names and codes but never the raw error', async () => {
    const registry = TestPolicies.registry({
      circuitBreaker: { consecutiveFailures: 1, halfOpenAfterMs: 30_000 },
    });
    const events: ResilienceEvent[] = [];
    registry.subscribe((event) => {
      events.push(event);
    });
    const coded = Object.assign(new Error('down'), {
      code: 'PLATFORM.DB.DOWN',
      status: 503,
    });
    await expect(
      registry.execute(API, async () => Promise.reject(coded)),
    ).rejects.toBe(coded);
    const breaks = events.filter(
      (event) => event.kind === ResilienceEventKind.Break,
    );
    expect(breaks).toEqual([
      expect.objectContaining({
        policy: API.value,
        dependencyKey: API.value,
        detail: { errorName: 'Error', errorCode: 'PLATFORM.DB.DOWN' },
      }),
    ]);
    expect(breaks[0]?.detail).not.toHaveProperty('cause');
  });

  it('ignores listeners that throw synchronously or reject', async () => {
    const registry = TestPolicies.registry();
    registry.subscribe(() => {
      throw new Error('listener broke');
    });
    registry.subscribe(() => Promise.reject(new Error('async broke')));
    await expect(registry.execute(API, async () => 'fine')).resolves.toBe(
      'fine',
    );
  });

  it('keeps the deprecated onEvent alias working', async () => {
    const registry = TestPolicies.registry();
    const seen: ResilienceEvent[] = [];
    const unsubscribe = registry.onEvent((event) => {
      seen.push(event);
    });
    await expect(registry.execute(API, async () => 'ok')).resolves.toBe('ok');
    unsubscribe();
    expect(seen).toEqual([]);
  });

  it('rejects an unknown policy with UnknownPolicyError', async () => {
    const registry = new ResilienceRegistry();
    await expect(
      registry.execute(PolicyName.of('missing'), async () => 'x'),
    ).rejects.toBeInstanceOf(UnknownPolicyError);
  });

  it('runs the built-in cache policy without configuration', async () => {
    const registry = new ResilienceRegistry();
    await expect(
      registry.execute(PolicyName.Cache, async () => 'cached'),
    ).resolves.toBe('cached');
  });

  it('registers a policy for a service and runs it', async () => {
    const registry = new ResilienceRegistry();
    const payments = PolicyName.of('payments');
    registry.register(payments, TestPolicies.config());
    await expect(registry.execute(payments, async () => 'paid')).resolves.toBe(
      'paid',
    );
  });

  it('accepts the same registration twice and rejects another configuration for the name', () => {
    const registry = new ResilienceRegistry();
    const payments = PolicyName.of('payments');
    const config = TestPolicies.config();
    registry.register(payments, config);
    expect(() => registry.register(payments, config)).not.toThrow();
    expect(() =>
      registry.register(payments, TestPolicies.config({ timeoutMs: 80 })),
    ).toThrow(
      expect.objectContaining({ code: ResilienceErrorCode.InvalidPolicy }),
    );
  });

  it('rejects an invalid override when built', () => {
    expect(() => new ResilienceRegistry({ cache: { timeoutMs: 0 } })).toThrow(
      InvalidPolicyError,
    );
  });

  it('rejects an override key that is not a valid policy name', () => {
    expect(
      () => new ResilienceRegistry({ 'Not Valid': { timeoutMs: 10 } }),
    ).toThrow(
      expect.objectContaining({ code: ResilienceErrorCode.InvalidPolicy }),
    );
  });

  it('applies a partial override to the built-in cache policy', async () => {
    const registry = new ResilienceRegistry({
      cache: { totalTimeoutMs: 5_000 },
    });
    await expect(
      registry.execute(PolicyName.Cache, async () => 'ok'),
    ).resolves.toBe('ok');
  });

  it('rejects a call beyond the bulkhead limit when the queue has no room', async () => {
    const registry = TestPolicies.registry({
      bulkhead: { limit: 1, queue: 0 },
    });
    const blocker = new Deferred<string>();
    const first = registry.execute(API, () => blocker.promise);
    await Flush.macrotask();
    await expect(
      registry.execute(API, async () => 'second'),
    ).rejects.toBeInstanceOf(BulkheadFullError);
    blocker.resolve('first');
    await expect(first).resolves.toBe('first');
  });

  it('rejects a call in the bulkhead queue when the caller aborts while it waits', async () => {
    const registry = TestPolicies.registry({
      bulkhead: { limit: 1, queue: 1 },
      timeoutMs: 60_000,
    });
    const blocker = new Deferred<string>();
    const first = registry.execute(API, () => blocker.promise);
    await Flush.macrotask();
    const controller = new AbortController();
    const queued = registry.execute(API, async () => 'late', {
      signal: controller.signal,
    });
    controller.abort(new Error('gave up'));
    await expect(queued).rejects.toThrow('gave up');
    blocker.resolve('first');
    await expect(first).resolves.toBe('first');
  });

  it('timestamps events with the injected clock', async () => {
    const clock = new FixedClock(new Date('2030-05-01T10:00:00.000Z'));
    const registry = TestPolicies.registry(
      { circuitBreaker: { consecutiveFailures: 1, halfOpenAfterMs: 30_000 } },
      { clock },
    );
    const events: ResilienceEvent[] = [];
    registry.subscribe((event) => {
      events.push(event);
    });
    await expect(
      registry.execute(API, async () =>
        Promise.reject(UpstreamErrors.unavailable()),
      ),
    ).rejects.toBeDefined();
    expect(events[0]?.at).toBe(new Date('2030-05-01T10:00:00.000Z').getTime());
  });

  it('classifies a failure with a declared transient kind as retryable', async () => {
    const registry = TestPolicies.registry();
    let attempts = 0;
    const error = UpstreamErrors.declaredTransient();
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
    expect(attempts).toBe(3);
  });
});
