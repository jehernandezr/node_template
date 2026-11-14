import { ErrorCode } from '@platform/kernel';
import { observabilityErrorCatalog } from '../observability-error-catalog.js';
import { ObservabilityErrorCode } from '../observability-error-code.enum.js';

describe('observabilityErrorCatalog', () => {
  it.each(Object.values(ObservabilityErrorCode))(
    'declares %s with a valid code',
    (code) => {
      expect(ErrorCode.isValid(code)).toBe(true);
    },
  );

  it.each(Object.values(ObservabilityErrorCode))(
    'has a catalog entry for %s',
    (code) => {
      expect(observabilityErrorCatalog.map((entry) => entry.code)).toContain(
        code,
      );
    },
  );
});
