import { ResilienceError, ResilienceErrorCode } from './errors.js';
import type { ResilienceEvent } from './events.js';
import { ResilienceRegistry } from './registry.js';
import { ResilienceEventKind, ResiliencePolicyName } from './policy-name.js';

function transientError(): Error {
  return Object.assign(new Error('upstream down'), { status: 503 });
}

function fastRegistry(
  overrides: ConstructorParameters<typeof ResilienceRegistry>[0] = {},
): ResilienceRegistry {
  return new ResilienceRegistry({
    [ResiliencePolicyName.ExternalApi]: {
      timeoutMs: 50,
      retry: { maxAttempts: 3, initialDelayMs: 1, maxDelayMs: 5 },
      // The breaker wraps each attempt, so keep it above the attempts used by the default test setup.
      circuitBreaker: { consecutiveFailures: 10, halfOpenAfterMs: 30 },
    },
    ...overrides,
  });
}

const never = (): Promise<never> => new Promise<never>(() => undefined);

describe('ResilienceRegistry', () => {
  it('retries transient errors of an idempotent call until success', async () => {
    const registry = fastRegistry();
    let attempts = 0;

    const result = await registry.execute(
      ResiliencePolicyName.ExternalApi,
      async () => {
        attempts += 1;
        if (attempts < 3) {
          throw transientError();
        }
        return 'done';
      },
      { idempotent: true },
    );

    expect(result).toBe('done');
    expect(attempts).toBe(3);
  });

  it('does not retry a non-idempotent call by default', async () => {
    const registry = fastRegistry();
    const error = transientError();
    let attempts = 0;

    await expect(
      registry.execute(ResiliencePolicyName.ExternalApi, async () => {
        attempts += 1;
        throw error;
      }),
    ).rejects.toBe(error);
    expect(attempts).toBe(1);
  });

  it('does not retry non-transient errors of an idempotent call', async () => {
    const registry = fastRegistry();
    let attempts = 0;
    const validation = Object.assign(new Error('invalid'), { status: 422 });

    await expect(
      registry.execute(
        ResiliencePolicyName.ExternalApi,
        async () => {
          attempts += 1;
          throw validation;
        },
        { idempotent: true },
      ),
    ).rejects.toBe(validation);
    expect(attempts).toBe(1);
  });

  it('gives up after maxAttempts total calls', async () => {
    const registry = fastRegistry({
      [ResiliencePolicyName.ExternalApi]: {
        timeoutMs: 50,
        retry: { maxAttempts: 2, initialDelayMs: 1, maxDelayMs: 2 },
      },
    });
    let attempts = 0;

    await expect(
      registry.execute(
        ResiliencePolicyName.ExternalApi,
        async () => {
          attempts += 1;
          throw transientError();
        },
        { idempotent: true },
      ),
    ).rejects.toThrow('upstream down');
    expect(attempts).toBe(2);
  });

  it('retries a transient error found in the cause chain', async () => {
    const registry = fastRegistry();
    let attempts = 0;

    await expect(
      registry.execute(
        ResiliencePolicyName.ExternalApi,
        async () => {
          attempts += 1;
          throw Object.assign(new Error('wrapped'), {
            cause: { code: 'ECONNRESET' },
          });
        },
        { idempotent: true },
      ),
    ).rejects.toThrow('wrapped');
    expect(attempts).toBe(3);
  });

  it('honors Retry-After as the minimum delay before the next attempt', async () => {
    const registry = fastRegistry({
      [ResiliencePolicyName.ExternalApi]: {
        timeoutMs: 50,
        retry: { maxAttempts: 2, initialDelayMs: 1, maxDelayMs: 2 },
      },
    });
    const started = Date.now();
    let attempts = 0;

    await expect(
      registry.execute(
        ResiliencePolicyName.ExternalApi,
        async () => {
          attempts += 1;
          if (attempts === 1) {
            throw Object.assign(new Error('slow down'), {
              status: 429,
              retryAfterMs: 60,
            });
          }
          return 'ok';
        },
        { idempotent: true },
      ),
    ).resolves.toBe('ok');
    expect(attempts).toBe(2);
    expect(Date.now() - started).toBeGreaterThanOrEqual(55);
  });

  it('opens the circuit after N failures and maps to CircuitOpen with retryAfterMs', async () => {
    const registry = fastRegistry({
      [ResiliencePolicyName.ExternalApi]: {
        timeoutMs: 50,
        retry: undefined,
        circuitBreaker: { consecutiveFailures: 2, halfOpenAfterMs: 10_000 },
      },
    });
    const fn = jest.fn(async (): Promise<never> => {
      throw transientError();
    });

    await expect(
      registry.execute(ResiliencePolicyName.ExternalApi, fn),
    ).rejects.toThrow('upstream down');
    await expect(
      registry.execute(ResiliencePolicyName.ExternalApi, fn),
    ).rejects.toThrow('upstream down');

    const error = await registry
      .execute(ResiliencePolicyName.ExternalApi, fn)
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ResilienceError);
    expect((error as ResilienceError).code).toBe(
      ResilienceErrorCode.CircuitOpen,
    );
    expect((error as ResilienceError).retryAfterMs).toBe(10_000);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('keeps a separate breaker per dependencyKey', async () => {
    const registry = fastRegistry({
      [ResiliencePolicyName.ExternalApi]: {
        timeoutMs: 50,
        retry: undefined,
        circuitBreaker: { consecutiveFailures: 1, halfOpenAfterMs: 10_000 },
      },
    });

    await expect(
      registry.execute(
        ResiliencePolicyName.ExternalApi,
        async () => {
          throw transientError();
        },
        { dependencyKey: 'payments' },
      ),
    ).rejects.toThrow('upstream down');

    const blocked = await registry
      .execute(ResiliencePolicyName.ExternalApi, async () => 'payments ok', {
        dependencyKey: 'payments',
      })
      .catch((e: unknown) => e);
    expect((blocked as ResilienceError).code).toBe(
      ResilienceErrorCode.CircuitOpen,
    );

    await expect(
      registry.execute(
        ResiliencePolicyName.ExternalApi,
        async () => 'maps ok',
        { dependencyKey: 'maps' },
      ),
    ).resolves.toBe('maps ok');
  });

  it('does not open the circuit on non-transient errors', async () => {
    const registry = fastRegistry({
      [ResiliencePolicyName.ExternalApi]: {
        timeoutMs: 50,
        circuitBreaker: { consecutiveFailures: 1, halfOpenAfterMs: 10_000 },
      },
    });

    for (let i = 0; i < 3; i += 1) {
      await expect(
        registry.execute(ResiliencePolicyName.ExternalApi, async () => {
          throw new Error('bad input');
        }),
      ).rejects.toThrow('bad input');
    }
    await expect(
      registry.execute(ResiliencePolicyName.ExternalApi, async () => 'ok'),
    ).resolves.toBe('ok');
  });

  it('maps a slow call to Timeout', async () => {
    const registry = fastRegistry({
      [ResiliencePolicyName.Cache]: { timeoutMs: 20 },
    });

    const error = await registry
      .execute(ResiliencePolicyName.Cache, never)
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ResilienceError);
    expect((error as ResilienceError).code).toBe(ResilienceErrorCode.Timeout);
  });

  it('enforces the total time budget across retries and maps it to Timeout', async () => {
    const registry = fastRegistry();
    const events: ResilienceEvent[] = [];
    registry.onEvent((event) => {
      events.push(event);
    });
    const started = Date.now();

    const error = await registry
      .execute(ResiliencePolicyName.ExternalApi, never, {
        idempotent: true,
        totalTimeoutMs: 30,
      })
      .catch((e: unknown) => e);

    expect((error as ResilienceError).code).toBe(ResilienceErrorCode.Timeout);
    expect(Date.now() - started).toBeLessThan(500);
    expect(
      events.some(
        (event) =>
          event.kind === ResilienceEventKind.Timeout &&
          event.detail?.timeoutMs === 30,
      ),
    ).toBe(true);
  });

  it('rejects with the caller reason when the signal aborts mid-call', async () => {
    const registry = fastRegistry();
    const controller = new AbortController();
    const reason = new Error('client went away');
    setTimeout(() => controller.abort(reason), 10);

    await expect(
      registry.execute(ResiliencePolicyName.ExternalApi, never, {
        signal: controller.signal,
      }),
    ).rejects.toBe(reason);
  });

  it('stops retrying when the caller aborts', async () => {
    const registry = fastRegistry({
      [ResiliencePolicyName.ExternalApi]: {
        timeoutMs: 50,
        retry: { maxAttempts: 3, initialDelayMs: 200, maxDelayMs: 200 },
      },
    });
    const controller = new AbortController();
    const reason = new Error('stop');
    let attempts = 0;
    setTimeout(() => controller.abort(reason), 20);

    await expect(
      registry.execute(
        ResiliencePolicyName.ExternalApi,
        async () => {
          attempts += 1;
          throw transientError();
        },
        { idempotent: true, signal: controller.signal },
      ),
    ).rejects.toBe(reason);
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(attempts).toBe(1);
  });

  it('rejects immediately when the signal is already aborted', async () => {
    const registry = fastRegistry();
    const controller = new AbortController();
    controller.abort(new Error('early'));
    const fn = jest.fn(async () => 'never');

    await expect(
      registry.execute(ResiliencePolicyName.Email, fn, {
        signal: controller.signal,
      }),
    ).rejects.toThrow('early');
    expect(fn).not.toHaveBeenCalled();
  });

  it('passes an abort signal to the operation', async () => {
    const registry = fastRegistry();
    const signal = await registry.execute(
      ResiliencePolicyName.Email,
      async (s) => s,
    );

    expect(signal).toBeInstanceOf(AbortSignal);
  });

  it('aborts the operation signal on return by default', async () => {
    const registry = fastRegistry();
    const signal = await registry.execute(
      ResiliencePolicyName.ExternalApi,
      async (s) => s,
    );

    expect(signal.aborted).toBe(true);
  });

  it('keeps the signal alive after return for streaming policies', async () => {
    const registry = fastRegistry();
    const signal = await registry.execute(
      ResiliencePolicyName.AiStreaming,
      async (s) => s,
    );

    expect(signal.aborted).toBe(false);
  });

  it('emits events for retries, timeouts and breaks without raw errors', async () => {
    const registry = fastRegistry({
      [ResiliencePolicyName.Cache]: {
        timeoutMs: 10,
        circuitBreaker: { consecutiveFailures: 1, halfOpenAfterMs: 10_000 },
      },
    });
    const events: ResilienceEvent[] = [];
    const unsubscribe = registry.onEvent((event) => {
      events.push(event);
    });

    await registry
      .execute(ResiliencePolicyName.Cache, never)
      .catch(() => undefined);
    await registry
      .execute(
        ResiliencePolicyName.ExternalApi,
        async () => {
          throw transientError();
        },
        { idempotent: true },
      )
      .catch(() => undefined);
    unsubscribe();
    await registry
      .execute(ResiliencePolicyName.Cache, async () => 'ignored')
      .catch(() => undefined);

    const kinds = events.map((event) => event.kind);
    expect(kinds).toContain(ResilienceEventKind.Timeout);
    expect(kinds).toContain(ResilienceEventKind.Break);
    expect(kinds).toContain(ResilienceEventKind.Retry);
    const timeout = events.find(
      (event) => event.kind === ResilienceEventKind.Timeout,
    );
    expect(timeout?.policy).toBe(ResiliencePolicyName.Cache);
    expect(timeout?.dependencyKey).toBe(ResiliencePolicyName.Cache);
    const retry = events.find(
      (event) => event.kind === ResilienceEventKind.Retry,
    );
    expect(retry?.detail).toEqual(
      expect.objectContaining({
        attempt: 1,
        errorName: 'Error',
        errorCode: undefined,
      }),
    );
    for (const event of events) {
      expect(typeof event.at).toBe('number');
      for (const value of Object.values(event.detail ?? {})) {
        expect(typeof value === 'object' && value !== null).toBe(false);
      }
    }
  });

  it('ignores listeners that throw synchronously', async () => {
    const registry = fastRegistry();
    registry.onEvent(() => {
      throw new Error('metrics down');
    });

    await expect(
      registry.execute(ResiliencePolicyName.Queue, async () => 42),
    ).resolves.toBe(42);
  });

  it('ignores listeners whose promise rejects', async () => {
    const registry = fastRegistry();
    registry.onEvent(async () => {
      throw new Error('async metrics down');
    });

    await expect(
      registry.execute(ResiliencePolicyName.Queue, async () => 7),
    ).resolves.toBe(7);
    await new Promise((resolve) => setTimeout(resolve, 10));
  });

  it('stores and returns the default registry', () => {
    const registry = fastRegistry();
    ResilienceRegistry.setDefault(registry);
    expect(ResilienceRegistry.getDefault()).toBe(registry);
    ResilienceRegistry.setDefault(undefined);
    expect(ResilienceRegistry.getDefault()).toBeUndefined();
  });
});
