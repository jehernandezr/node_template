import { ERROR_CODE_PATTERN, platformErrorCatalog } from '@contracts/platform';
import { ErrorCode } from '@platform/kernel';
import { kernelErrorCatalog } from '../kernel-error-catalog.js';
import { primitivesErrorCatalog } from '../primitives-error-catalog.js';
import { PrimitivesErrorCode } from '../primitives-error-code.enum.js';

describe.each([
  ['platformErrorCatalog', platformErrorCatalog],
  ['kernelErrorCatalog', kernelErrorCatalog],
  ['primitivesErrorCatalog', primitivesErrorCatalog],
])('%s', (_name, catalog) => {
  it('is not empty and has no duplicate codes', () => {
    const codes = catalog.map((entry) => entry.code);
    expect(codes.length).toBeGreaterThan(0);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it.each(catalog.map((entry) => [entry.code]))(
    '%s matches both code patterns',
    (code) => {
      expect(ErrorCode.isValid(code)).toBe(true);
      expect(ERROR_CODE_PATTERN.test(code)).toBe(true);
    },
  );
});

describe('code patterns', () => {
  it('are the same expression in the kernel and in the contracts', () => {
    expect(ERROR_CODE_PATTERN.source).toBe(ErrorCode.PATTERN.source);
  });
});

describe('primitives codes keep their observable values', () => {
  it.each([
    [
      PrimitivesErrorCode.InvalidArgument,
      'PLATFORM.PRIMITIVES.INVALID_ARGUMENT',
    ],
    [PrimitivesErrorCode.NonJsonValue, 'PLATFORM.PRIMITIVES.NON_JSON_VALUE'],
    [
      PrimitivesErrorCode.DeadlineExceeded,
      'PLATFORM.PRIMITIVES.DEADLINE_EXCEEDED',
    ],
    [PrimitivesErrorCode.StaleClaim, 'PLATFORM.PRIMITIVES.STALE_CLAIM'],
  ])('keep the observable value of %s', (libraryCode, expected) => {
    expect(libraryCode).toBe(expected);
  });
});
