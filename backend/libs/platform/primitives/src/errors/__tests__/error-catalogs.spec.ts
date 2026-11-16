import {
  ERROR_CODE_PATTERN,
  PlatformErrorCode,
  platformErrorCatalog,
} from '@contracts/platform';
import { ErrorCode, KernelErrorCode } from '@platform/kernel';
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

describe('library codes that already existed in the platform contract', () => {
  it.each([
    [KernelErrorCode.InvalidId, PlatformErrorCode.KernelInvalidId],
    [
      PrimitivesErrorCode.InvalidArgument,
      PlatformErrorCode.PrimitivesInvalidArgument,
    ],
    [
      PrimitivesErrorCode.NonJsonValue,
      PlatformErrorCode.PrimitivesNonJsonValue,
    ],
    [
      PrimitivesErrorCode.DeadlineExceeded,
      PlatformErrorCode.PrimitivesDeadlineExceeded,
    ],
    [PrimitivesErrorCode.StaleClaim, PlatformErrorCode.PrimitivesStaleClaim],
  ])('keep the observable value %s', (libraryCode, platformCode) => {
    expect(libraryCode).toBe(platformCode);
  });
});
