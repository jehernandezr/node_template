import { ERROR_CODE_PATTERN } from '@contracts/platform';
import { ErrorCode } from '@platform/kernel';
import { bloomErrorCatalog } from '../bloom-error-catalog.js';
import { BloomErrorCode } from '../bloom-error-code.enum.js';

describe('bloomErrorCatalog', () => {
  it.each(Object.values(BloomErrorCode))(
    'has an entry for %s in the code format of the platform',
    (code) => {
      expect(ErrorCode.PATTERN.test(code)).toBe(true);
      expect(ERROR_CODE_PATTERN.test(code)).toBe(true);
      expect(bloomErrorCatalog.map((entry) => entry.code)).toContain(code);
    },
  );
});
