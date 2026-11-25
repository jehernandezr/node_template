import { ErrorAudience, ERROR_CODE_PATTERN } from '@contracts/platform';
import { PersistenceErrorCode } from '../persistence-error-code.enum.js';
import { persistenceErrorCatalog } from '../persistence-error-catalog.js';

describe('persistenceErrorCatalog', () => {
  const values = Object.values(PersistenceErrorCode);

  it('has one entry per code, in enum order', () => {
    expect(persistenceErrorCatalog.map((entry) => entry.code)).toEqual(values);
  });

  it.each(values)('uses the SERVICE.SUBMODULE.ERROR format in %s', (code) => {
    expect(code).toMatch(ERROR_CODE_PATTERN);
  });

  it('keeps every code internal', () => {
    for (const entry of persistenceErrorCatalog) {
      expect(entry.audience).toBe(ErrorAudience.Internal);
    }
  });
});
