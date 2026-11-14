import { ERROR_CODE_PATTERN } from '@contracts/platform';
import { ErrorCode } from '@platform/kernel';
import { resilienceErrorCatalog } from '../resilience-error-catalog.js';
import { ResilienceErrorCode } from '../resilience-error-code.enum.js';

describe('resilience error catalog', () => {
  it.each(Object.values(ResilienceErrorCode))(
    'declares a valid entry for %s',
    (code) => {
      expect(ErrorCode.PATTERN.test(code)).toBe(true);
      expect(ERROR_CODE_PATTERN.test(code)).toBe(true);
      expect(resilienceErrorCatalog.some((entry) => entry.code === code)).toBe(
        true,
      );
    },
  );

  it('marks the public codes as retryable and the policy errors as internal', () => {
    expect(resilienceErrorCatalog).toContainEqual(
      expect.objectContaining({
        code: ResilienceErrorCode.Timeout,
        httpStatus: 504,
        retryable: true,
      }),
    );
    expect(resilienceErrorCatalog).toContainEqual(
      expect.objectContaining({
        code: ResilienceErrorCode.InvalidPolicy,
        retryable: false,
      }),
    );
  });
});
