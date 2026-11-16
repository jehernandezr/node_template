import { ERROR_CODE_PATTERN } from '@contracts/platform';
import { ErrorCode } from '@platform/kernel';
import { cacheErrorCatalog } from '../cache-error-catalog.js';
import { CacheErrorCode } from '../cache-error-code.enum.js';

describe('cacheErrorCatalog', () => {
  it.each(Object.values(CacheErrorCode))(
    'has an entry for %s in the code format of the platform',
    (code) => {
      expect(ErrorCode.PATTERN.test(code)).toBe(true);
      expect(ERROR_CODE_PATTERN.test(code)).toBe(true);
      expect(cacheErrorCatalog.map((entry) => entry.code)).toContain(code);
    },
  );
});
