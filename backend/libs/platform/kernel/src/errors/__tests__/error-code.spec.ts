import { ErrorCode } from '../error-code.js';
import { KernelErrorCode } from '../kernel-error-code.enum.js';

describe('ErrorCode', () => {
  it.each([
    'SALES.STOCK.NOT_ENOUGH',
    'PLATFORM.INTERNAL_API.INVALID_INPUT',
    'A.B.C.D',
    'S3.UPLOAD.TOO_LARGE',
    ...Object.values(KernelErrorCode),
  ])('accepts %s', (code) => {
    expect(ErrorCode.isValid(code)).toBe(true);
    expect(ErrorCode.PATTERN.test(code)).toBe(true);
  });

  it.each([
    ['two segments', 'SALES.NOT_ENOUGH'],
    ['lowercase', 'sales.stock.not_enough'],
    ['empty segment', 'SALES..NOT_ENOUGH'],
    ['leading digit', '1SALES.STOCK.NOT_ENOUGH'],
    ['dash', 'SALES.STOCK.NOT-ENOUGH'],
    ['trailing dot', 'SALES.STOCK.'],
    ['empty', ''],
    ['number', 42],
    ['undefined', undefined],
  ])('rejects %s', (_label, code) => {
    expect(ErrorCode.isValid(code)).toBe(false);
  });
});
