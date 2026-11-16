import { ERROR_CODE_PATTERN } from '@contracts/platform';
import { ErrorCode } from '@platform/kernel';
import { internalApiErrorCatalog } from '../internal-api-error-catalog.js';
import { InternalApiErrorCode } from '../internal-api-error-code.enum.js';

describe('internal-api error catalog', () => {
  it.each(Object.values(InternalApiErrorCode))(
    'declares a valid entry for %s',
    (code) => {
      expect(ErrorCode.PATTERN.test(code)).toBe(true);
      expect(ERROR_CODE_PATTERN.test(code)).toBe(true);
      expect(internalApiErrorCatalog.some((entry) => entry.code === code)).toBe(
        true,
      );
    },
  );

  it('keeps the HTTP status of the codes it took over from the platform catalog', () => {
    expect(internalApiErrorCatalog).toContainEqual(
      expect.objectContaining({
        code: InternalApiErrorCode.IdempotencyKeyReuse,
        httpStatus: 409,
        retryable: false,
      }),
    );
  });
});
