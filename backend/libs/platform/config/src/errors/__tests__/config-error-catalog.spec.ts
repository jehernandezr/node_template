import { ErrorCode } from '@platform/kernel';
import { configErrorCatalog } from '../config-error-catalog.js';
import { ConfigErrorCode } from '../config-error-code.enum.js';

describe('configErrorCatalog', () => {
  it.each(Object.values(ConfigErrorCode))(
    'declares %s with a valid code',
    (code) => {
      expect(ErrorCode.isValid(code)).toBe(true);
    },
  );

  it.each(Object.values(ConfigErrorCode))(
    'has a catalog entry for %s',
    (code) => {
      expect(configErrorCatalog.map((entry) => entry.code)).toContain(code);
    },
  );
});
