import { ERROR_CODE_PATTERN } from '@contracts/platform';
import { ErrorCode, FailureKind } from '@platform/kernel';
import { RateLimitErrorCode } from '../rate-limit-error-code.enum.js';
import { rateLimitErrorCatalog } from '../rate-limit-error-catalog.js';
import { RateLimitExceededError } from '../rate-limit-exceeded.error.js';
import { FailureClassifier } from '@platform/primitives';

describe('rate-limit error catalog', () => {
  it.each(Object.values(RateLimitErrorCode))(
    'declares a valid entry for %s',
    (code) => {
      expect(ErrorCode.PATTERN.test(code)).toBe(true);
      expect(ERROR_CODE_PATTERN.test(code)).toBe(true);
      expect(rateLimitErrorCatalog.some((entry) => entry.code === code)).toBe(
        true,
      );
    },
  );

  it('describes the exceeded limit as a public, retryable 429', () => {
    expect(rateLimitErrorCatalog).toContainEqual(
      expect.objectContaining({
        code: RateLimitErrorCode.Exceeded,
        httpStatus: 429,
        retryable: true,
      }),
    );
  });
});

describe('RateLimitExceededError', () => {
  it('carries the code, the wait and the rule in details', () => {
    const error = new RateLimitExceededError('login', 1500);
    expect(error.code).toBe(RateLimitErrorCode.Exceeded);
    expect(error.retryAfterMs).toBe(1500);
    expect(error.retryable).toBe(true);
    expect(error.details).toEqual({ rule: 'login', retryAfterMs: 1500 });
    expect(new FailureClassifier().classify(error)).toBe(FailureKind.Transient);
  });
});
