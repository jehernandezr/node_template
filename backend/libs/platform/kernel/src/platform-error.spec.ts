import { KernelErrorCode } from './invalid-id.error.js';
import {
  ERROR_CODE_PATTERN,
  isErrorCode,
  isPlatformError,
  PlatformError,
} from './platform-error.js';

class UpstreamUnavailableError extends PlatformError {
  override readonly code = 'PLATFORM.TEST.UPSTREAM_UNAVAILABLE';
}

describe('PlatformError', () => {
  it('keeps code, message, retryable, details and the native cause', () => {
    const cause = new Error('socket hang up');
    const error = new UpstreamUnavailableError('Upstream unavailable', {
      retryable: true,
      details: { upstream: 'billing' },
      cause,
    });

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(PlatformError);
    expect(error.name).toBe('UpstreamUnavailableError');
    expect(error.code).toBe('PLATFORM.TEST.UPSTREAM_UNAVAILABLE');
    expect(error.message).toBe('Upstream unavailable');
    expect(error.retryable).toBe(true);
    expect(error.details).toEqual({ upstream: 'billing' });
    expect(error.cause).toBe(cause);
    expect(error.stack).toContain('UpstreamUnavailableError');
  });

  it('defaults to not retryable, without details or cause', () => {
    const error = new UpstreamUnavailableError('x');
    expect(error.retryable).toBe(false);
    expect(error.details).toBeUndefined();
    expect('cause' in error).toBe(false);
  });

  it('keeps falsy causes other than undefined', () => {
    expect(new UpstreamUnavailableError('x', { cause: null }).cause).toBeNull();
    expect(new UpstreamUnavailableError('x', { cause: 0 }).cause).toBe(0);
  });

  it('is recognised by isPlatformError', () => {
    expect(isPlatformError(new UpstreamUnavailableError('x'))).toBe(true);
    expect(isPlatformError(new Error('x'))).toBe(false);
    expect(isPlatformError({ code: 'A.B.C', retryable: false })).toBe(false);
    expect(isPlatformError(undefined)).toBe(false);
  });
});

describe('isErrorCode', () => {
  it.each([
    'SALES.STOCK.NOT_ENOUGH',
    'PLATFORM.INTERNAL_API.INVALID_INPUT',
    'A.B.C.D',
    'S3.UPLOAD.TOO_LARGE',
    KernelErrorCode.InvalidId,
  ])('accepts %s', (code) => {
    expect(isErrorCode(code)).toBe(true);
    expect(ERROR_CODE_PATTERN.test(code)).toBe(true);
  });

  it.each([
    ['two segments', 'SALES.NOT_ENOUGH'],
    ['lowercase', 'sales.stock.not_enough'],
    ['empty segment', 'SALES..NOT_ENOUGH'],
    ['leading digit', '1SALES.STOCK.NOT_ENOUGH'],
    ['dash', 'SALES.STOCK.NOT-ENOUGH'],
    ['trailing dot', 'SALES.STOCK.'],
    ['empty', ''],
  ])('rejects %s', (_label, code) => {
    expect(isErrorCode(code)).toBe(false);
  });

  it('rejects non-strings', () => {
    expect(isErrorCode(42)).toBe(false);
    expect(isErrorCode(undefined)).toBe(false);
  });
});
