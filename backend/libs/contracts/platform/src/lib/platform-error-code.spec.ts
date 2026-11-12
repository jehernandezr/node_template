import { PlatformErrorCode } from './platform-error-code.js';
import { platformErrorCatalog } from './error-catalog.js';

describe('PlatformErrorCode', () => {
  const values = Object.values(PlatformErrorCode);

  it('has exactly the 13 platform codes', () => {
    expect(values).toHaveLength(13);
  });

  it('has exactly one catalog entry per enum value', () => {
    for (const value of values) {
      const matches = platformErrorCatalog.filter(
        (entry) => entry.code === value,
      );
      expect(matches).toHaveLength(1);
    }
    expect(platformErrorCatalog).toHaveLength(values.length);
  });

  it('uses codes in the SERVICIO.SUBMODULO.ERROR format', () => {
    for (const value of values) {
      expect(value).toMatch(/^[A-Z]+(\.[A-Z_]+){2}$/);
    }
  });
});
