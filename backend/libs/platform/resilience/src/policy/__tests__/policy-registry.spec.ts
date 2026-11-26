import { FixedClock } from '@platform/kernel/test-utils';
import {
  BackoffStrategy,
  FailureClassifier,
  RetryPolicy,
} from '@platform/primitives';
import { BulkheadFullError } from '../../errors/bulkhead-full.error.js';
import { CircuitOpenError } from '../../errors/circuit-open.error.js';
import { InvalidPolicyError } from '../../errors/invalid-policy.error.js';
import { UnknownPolicyError } from '../../errors/unknown-policy.error.js';
import { ResilienceEventBus } from '../../events/resilience-event-bus.js';
import { PolicyRegistry } from '../policy-registry.js';
import { PolicyName } from '../policy-name.js';
import { DefaultPolicies } from '../default-policies.js';
import type { ResiliencePolicyConfig } from '../resilience-policy-config.js';

const NAME = PolicyName.of('payments');
const CONFIG: ResiliencePolicyConfig = {
  timeoutMs: 1000,
  retry: { policy: new RetryPolicy(2, 0, 0, BackoffStrategy.None) },
  circuitBreaker: { consecutiveFailures: 2, halfOpenAfterMs: 500 },
  bulkhead: { limit: 1, queue: 0 },
};

function build(
  overrides: Record<string, Partial<ResiliencePolicyConfig>> = {},
): PolicyRegistry {
  const clock = new FixedClock();
  return new PolicyRegistry(
    clock,
    new ResilienceEventBus(clock),
    new FailureClassifier(),
    overrides,
  );
}

describe('PolicyRegistry', () => {
  it('mixes overrides over the default policies', () => {
    const registry = build({ cache: { totalTimeoutMs: 999 } });
    expect(registry.config(PolicyName.Cache)).toEqual({
      ...DefaultPolicies.cache,
      totalTimeoutMs: 999,
    });
    expect(registry.config(PolicyName.Database)).toEqual(
      DefaultPolicies.database,
    );
  });

  it('keeps a partial override without base pending until its register', () => {
    const registry = build({ payments: { totalTimeoutMs: 2000 } });
    expect(() => registry.config(NAME)).toThrow(UnknownPolicyError);
    registry.register(NAME, CONFIG);
    expect(registry.config(NAME)).toEqual({ ...CONFIG, totalTimeoutMs: 2000 });
  });

  it('defines a new policy from an override that has its timeout', () => {
    const registry = build({ 'test-api': { timeoutMs: 40 } });
    expect(registry.config(PolicyName.of('test-api')).timeoutMs).toBe(40);
  });

  it('accepts the same registration twice and rejects another one', () => {
    const registry = build();
    registry.register(NAME, CONFIG);
    expect(() => registry.register(NAME, CONFIG)).not.toThrow();
    expect(() => registry.register(NAME, { ...CONFIG })).toThrow(
      InvalidPolicyError,
    );
  });

  it('rejects an unknown policy with UnknownPolicyError', () => {
    expect(() => build().config(NAME)).toThrow(UnknownPolicyError);
  });

  it('rejects an invalid override key when built', () => {
    expect(() => build({ 'Bad Key': { timeoutMs: 1 } })).toThrow(
      InvalidPolicyError,
    );
  });

  it('rejects a registered policy that is invalid', () => {
    expect(() => build().register(NAME, { ...CONFIG, timeoutMs: 0 })).toThrow(
      InvalidPolicyError,
    );
  });

  it('returns the same dependency entry for the same name and key, and another for another key', () => {
    const registry = build();
    registry.register(NAME, CONFIG);
    const first = registry.dependency(NAME, 'stripe');
    expect(registry.dependency(NAME, 'stripe')).toBe(first);
    expect(registry.dependency(NAME, 'paypal')).not.toBe(first);
    expect(first.bulkhead).toBeDefined();
    expect(first.breaker).toBeDefined();
  });

  it('creates only the parts the policy declares', () => {
    const registry = build();
    registry.register(NAME, { timeoutMs: 100 });
    expect(registry.dependency(NAME, 'x')).toEqual({
      bulkhead: undefined,
      breaker: undefined,
    });
  });

  it('rejects calls beyond the bulkhead and opens the breaker with the policy settings', async () => {
    const registry = build();
    registry.register(NAME, CONFIG);
    const entry = registry.dependency(NAME, 'stripe');
    const breaker = entry.breaker;
    const bulkhead = entry.bulkhead;
    expect(breaker).toBeDefined();
    expect(bulkhead).toBeDefined();
    const failing = (): Promise<never> =>
      Promise.reject(Object.assign(new Error('x'), { status: 503 }));
    await expect(breaker?.execute(failing)).rejects.toBeDefined();
    await expect(breaker?.execute(failing)).rejects.toBeDefined();
    await expect(breaker?.execute(async () => 'ok')).rejects.toBeInstanceOf(
      CircuitOpenError,
    );
    const held = bulkhead?.execute(() => new Promise<never>(() => undefined));
    expect(held).toBeDefined();
    await expect(
      bulkhead?.execute(async () => 'no room'),
    ).rejects.toBeInstanceOf(BulkheadFullError);
  });
});
