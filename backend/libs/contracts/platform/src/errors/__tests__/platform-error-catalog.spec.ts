import { ErrorAudience } from '../../enums/error-audience.enum.js';
import { PlatformErrorCode } from '../../enums/platform-error-code.enum.js';
import { ERROR_CODE_PATTERN, messageKeyFor } from '../../kit/error-catalog.js';
import { platformErrorCatalog } from '../platform-error-catalog.js';

describe('platformErrorCatalog', () => {
  const values = Object.values(PlatformErrorCode);
  const entries = platformErrorCatalog.map(
    (entry) => [entry.code, entry] as const,
  );

  it('has exactly one entry per enum value, in enum order', () => {
    expect(platformErrorCatalog.map((e) => e.code)).toEqual(values);
  });

  it('has no repeated codes', () => {
    expect(new Set(values).size).toBe(values.length);
  });

  it.each(values)('uses the SERVICIO.SUBMODULO.ERROR format in %s', (value) => {
    expect(value).toMatch(ERROR_CODE_PATTERN);
  });

  it.each(entries)(
    'derives the messageKey of %s with the ARB naming of the front',
    (_code, entry) => {
      expect(entry.messageKey).toBe(messageKeyFor(entry.code));
      expect(entry.messageKey).toMatch(/^error_platform_[a-z_]+$/);
    },
  );

  it('derives the messageKey from the code in snake case', () => {
    expect(messageKeyFor(PlatformErrorCode.RateLimitExceeded)).toBe(
      'error_platform_rate_limit_exceeded',
    );
  });

  it.each(entries)(
    'gives %s a valid status, audience and Spanish description',
    (_code, entry) => {
      expect(entry.httpStatus).toBeGreaterThanOrEqual(400);
      expect(entry.httpStatus).toBeLessThan(600);
      expect(Object.values(ErrorAudience)).toContain(entry.audience);
      expect(entry.description.length).toBeGreaterThan(0);
      expect(entry.description).not.toContain('—');
    },
  );

  it('keeps the codes the front already shows as public', () => {
    const publicCodes = platformErrorCatalog
      .filter((e) => e.audience === ErrorAudience.Public)
      .map((e) => e.code);
    expect(publicCodes).toEqual(
      expect.arrayContaining([
        PlatformErrorCode.ValidationInvalidInput,
        PlatformErrorCode.AuthForbidden,
        PlatformErrorCode.ShardingTenantMigrating,
        PlatformErrorCode.InternalUnexpected,
      ]),
    );
  });

  it('marks TENANT_MIGRATING as retryable with status 503', () => {
    const entry = platformErrorCatalog.find(
      (e) => e.code === PlatformErrorCode.ShardingTenantMigrating,
    );
    expect(entry).toMatchObject({ httpStatus: 503, retryable: true });
  });

  it('only declares public codes', () => {
    for (const entry of platformErrorCatalog) {
      expect(entry.audience).toBe(ErrorAudience.Public);
    }
  });
});
