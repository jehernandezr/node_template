import { ErrorAudience } from '../enums/error-audience.enum.js';
import { PlatformErrorCode } from '../enums/platform-error-code.enum.js';
import { platformErrorCatalog } from '../errors/platform-error-catalog.js';
import type { ErrorCatalogEntry } from '../types/error-catalog-entry.type.js';
import {
  defineErrorCatalog,
  ErrorCatalog,
  messageKeyFor,
} from './error-catalog.js';

const sample = (code: string): ErrorCatalogEntry => ({
  code,
  httpStatus: 400,
  retryable: false,
  audience: ErrorAudience.Public,
  messageKey: messageKeyFor(code),
  description: 'Ejemplo.',
});

const spec = {
  httpStatus: 400,
  retryable: false,
  audience: ErrorAudience.Public,
  description: 'Ejemplo.',
};

describe('messageKeyFor', () => {
  it('lowercases the code and replaces dots and dashes', () => {
    expect(messageKeyFor('IDENTITY.MFA.CODE_EXPIRED')).toBe(
      'error_identity_mfa_code_expired',
    );
    expect(messageKeyFor('A-B.C.D')).toBe('error_a_b_c_d');
  });
});

describe('defineErrorCatalog', () => {
  enum Sample {
    One = 'SAMPLE.TEST.ONE',
    Two = 'SAMPLE.TEST.TWO',
  }

  it('builds one frozen entry per enum value with the derived message key', () => {
    const catalog = defineErrorCatalog(Sample, {
      [Sample.One]: spec,
      [Sample.Two]: { ...spec, httpStatus: 409 },
    });
    expect(catalog.map((e) => e.code)).toEqual([Sample.One, Sample.Two]);
    expect(catalog[1]).toMatchObject({
      httpStatus: 409,
      messageKey: 'error_sample_test_two',
    });
    expect(Object.isFrozen(catalog[0])).toBe(true);
  });

  it('rejects a missing entry', () => {
    expect(() =>
      defineErrorCatalog(Sample, { [Sample.One]: spec } as never),
    ).toThrow(/Falta la entrada/);
  });

  it('rejects entries outside the enum and invalid statuses', () => {
    expect(() =>
      defineErrorCatalog(Sample, {
        [Sample.One]: spec,
        [Sample.Two]: spec,
        'SAMPLE.TEST.THREE': spec,
      } as never),
    ).toThrow(/fuera del enum/);
    expect(() =>
      defineErrorCatalog(Sample, {
        [Sample.One]: spec,
        [Sample.Two]: { ...spec, httpStatus: 200 },
      }),
    ).toThrow(/Estado HTTP/);
  });

  it('rejects codes with an invalid format', () => {
    enum Bad {
      X = 'bad.code',
    }
    expect(() => defineErrorCatalog(Bad, { [Bad.X]: spec })).toThrow(
      /inválido/,
    );
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
