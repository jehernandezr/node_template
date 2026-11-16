import { ErrorAudience, platformErrorCatalog } from '@contracts/platform';
import { criteriaErrorCatalog } from '../criteria-error-catalog.js';
import { CriteriaErrorCode } from '../criteria-error-code.enum.js';

describe('criteriaErrorCatalog', () => {
  describe('when it is read', () => {
    const codes = criteriaErrorCatalog.map((entry) => entry.code);

    it.each(Object.values(CriteriaErrorCode))('has an entry for %s', (code) => {
      expect(codes).toContain(code);
    });

    it('has exactly one entry per code', () => {
      expect(codes).toHaveLength(Object.values(CriteriaErrorCode).length);
    });

    it.each(Object.values(CriteriaErrorCode))(
      'uses the PLATFORM.CRITERIA format for %s',
      (code) => {
        expect(code).toMatch(/^PLATFORM\.CRITERIA\.[A-Z_]+$/);
      },
    );
  });

  describe('when it is compared with the central catalog', () => {
    it.each(Object.values(CriteriaErrorCode))(
      'keeps the HTTP status and audience of %s',
      (code) => {
        const local = criteriaErrorCatalog.find((entry) => entry.code === code);
        const central = platformErrorCatalog.find(
          (entry) => entry.code === code,
        );
        expect(local).toBeDefined();
        expect(central).toBeDefined();
        expect(local).toMatchObject({
          httpStatus: central?.httpStatus,
          audience: central?.audience,
        });
        expect(local?.audience).toBe(ErrorAudience.Public);
      },
    );
  });
});
