import { BackoffStrategy, RetryPolicy } from '@platform/primitives';
import { ResilienceErrorCode } from '../../errors/resilience-error-code.enum.js';
import { PolicyConfigValidator } from '../policy-config-validator.js';
import type { ResiliencePolicyConfig } from '../resilience-policy-config.js';

const VALID: ResiliencePolicyConfig = {
  timeoutMs: 100,
  totalTimeoutMs: 500,
  retry: {
    policy: new RetryPolicy(3, 10, 100, BackoffStrategy.EqualJitter),
    maxRetryAfterMs: 1000,
  },
  circuitBreaker: { consecutiveFailures: 5, halfOpenAfterMs: 1000 },
  bulkhead: { limit: 2, queue: 0 },
};

describe('PolicyConfigValidator', () => {
  it('accepts a complete valid policy', () => {
    expect(() => PolicyConfigValidator.validate(VALID)).not.toThrow();
  });

  it.each<[string, Partial<ResiliencePolicyConfig>]>([
    ['a missing timeout', { timeoutMs: undefined }],
    ['a zero timeout', { timeoutMs: 0 }],
    ['a fractional timeout', { timeoutMs: 1.5 }],
    ['a negative total budget', { totalTimeoutMs: -1 }],
    [
      'a negative Retry-After cap',
      {
        retry: {
          policy: new RetryPolicy(1, 0, 0, BackoffStrategy.None),
          maxRetryAfterMs: -1,
        },
      },
    ],
    [
      'zero consecutive failures',
      { circuitBreaker: { consecutiveFailures: 0, halfOpenAfterMs: 1 } },
    ],
    [
      'a negative half-open wait',
      { circuitBreaker: { consecutiveFailures: 1, halfOpenAfterMs: -1 } },
    ],
    ['a zero bulkhead limit', { bulkhead: { limit: 0, queue: 0 } }],
    ['a negative bulkhead queue', { bulkhead: { limit: 1, queue: -1 } }],
  ])('rejects %s with InvalidPolicy', (_label, override) => {
    const config = { ...VALID, ...override } as ResiliencePolicyConfig;
    expect(() => PolicyConfigValidator.validate(config)).toThrow(
      expect.objectContaining({ code: ResilienceErrorCode.InvalidPolicy }),
    );
  });
});
