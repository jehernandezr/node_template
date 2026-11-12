import {
  ErrorCatalog,
  ErrorCatalogEntry,
  platformErrorCatalog,
} from './error-catalog.js';
import { PlatformErrorCode } from './platform-error-code.js';

const sample = (code: string): ErrorCatalogEntry => ({
  code,
  httpStatus: 400,
  retryable: false,
  messageKey: 'errors.platform.test.sample',
  description: 'Ejemplo.',
});

describe('platformErrorCatalog', () => {
  it('has valid statuses, message keys and Spanish descriptions', () => {
    for (const entry of platformErrorCatalog) {
      expect(entry.httpStatus).toBeGreaterThanOrEqual(400);
      expect(entry.messageKey).toMatch(
        /^errors\.platform\.[a-z_]+(\.[a-z_]+)+$/,
      );
      expect(entry.description.length).toBeGreaterThan(0);
      expect(entry.description).not.toContain('—');
    }
  });

  it('marks TENANT_MIGRATING as retryable with status 503', () => {
    const entry = platformErrorCatalog.find(
      (e) => e.code === PlatformErrorCode.ShardingTenantMigrating,
    );
    expect(entry).toMatchObject({ httpStatus: 503, retryable: true });
  });
});

describe('ErrorCatalog', () => {
  it('registers entries and returns them by code', () => {
    const catalog = new ErrorCatalog();
    catalog.register(platformErrorCatalog);
    expect(catalog.get(PlatformErrorCode.AuthForbidden)?.httpStatus).toBe(403);
    expect(catalog.get('IDENTITY.MFA.CODE_EXPIRED')).toBeUndefined();
    expect(catalog.all()).toHaveLength(platformErrorCatalog.length);
  });

  it('throws when a code is registered twice', () => {
    const catalog = new ErrorCatalog();
    catalog.register([sample('PLATFORM.TEST.ONE')]);
    expect(() => catalog.register([sample('PLATFORM.TEST.ONE')])).toThrow(
      /duplicado/,
    );
  });

  it('throws when a batch repeats a code and keeps the catalog unchanged', () => {
    const catalog = new ErrorCatalog();
    expect(() =>
      catalog.register([
        sample('PLATFORM.TEST.ONE'),
        sample('PLATFORM.TEST.ONE'),
      ]),
    ).toThrow(/duplicado/);
    expect(catalog.all()).toHaveLength(0);
  });

  it.each([
    'platform.test.one',
    'PLATFORM.TEST',
    'PLATFORM.TEST.ONE.TWO',
    'PLATFORM.test.ONE',
  ])('throws for invalid code %s', (code) => {
    const catalog = new ErrorCatalog();
    expect(() => catalog.register([sample(code)])).toThrow(/inválido/);
  });
});
