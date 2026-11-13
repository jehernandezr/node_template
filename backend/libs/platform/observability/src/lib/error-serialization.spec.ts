import { Secret } from '@platform/config';
import { PlatformError } from '@platform/kernel';
import {
  isSensitiveKey,
  MAX_ERROR_CAUSE_DEPTH,
  redact,
  redactString,
  REDACTED,
} from './redaction.js';

class OrderRejectedError extends PlatformError {
  readonly code = 'ORDERS.CHECKOUT.REJECTED';
}

describe('isSensitiveKey: one-time codes and card data (PLAT-09)', () => {
  it.each([
    'mfaCode',
    'mfa_code',
    'verificationCode',
    'emailVerificationCode',
    'oneTimeCode',
    'recoveryCodes',
    'recovery_code',
    'resetCode',
    'otpCode',
    'totpCode',
    'backupCodes',
    'twoFactorCode',
    'pin',
    'userPin',
    'pinCode',
    'cvv',
    'cardCvc',
    'cardPan',
    'passcode',
  ])('flags %s', (key) => {
    expect(isSensitiveKey(key)).toBe(true);
  });

  it.each([
    'code',
    'errorCode',
    'statusCode',
    'countryCode',
    'currencyCode',
    'postalCode',
    'pinned',
    'spinner',
    'timeSpan',
  ])('keeps %s visible', (key) => {
    expect(isSensitiveKey(key)).toBe(false);
  });

  it('masks one-time codes in query strings', () => {
    expect(redactString('/verify?mfa_code=123456&pin=0000&page=2')).toBe(
      `/verify?mfa_code=${REDACTED}&pin=${REDACTED}&page=2`,
    );
  });
});

describe('redact: errors (PLAT-09)', () => {
  it('keeps code, retryable and sanitized details of a PlatformError', () => {
    const error = new OrderRejectedError('order rejected', {
      details: { orderId: 'o-1', verificationCode: '123456', token: 't' },
      retryable: true,
    });

    const out = redact(error) as Record<string, unknown>;

    expect(out).toMatchObject({
      name: 'OrderRejectedError',
      message: 'order rejected',
      code: 'ORDERS.CHECKOUT.REJECTED',
      retryable: true,
      details: {
        orderId: 'o-1',
        verificationCode: REDACTED,
        token: REDACTED,
      },
    });
    expect(typeof out['stack']).toBe('string');
  });

  it('serializes the cause chain with redaction', () => {
    const root = Object.assign(new Error('connect https://u:p@db/x'), {
      code: 'ECONNRESET',
    });
    const error = new OrderRejectedError('wrapped', { cause: root });

    const out = redact(error) as { cause: Record<string, unknown> };

    expect(out.cause).toMatchObject({
      name: 'Error',
      code: 'ECONNRESET',
      message: `connect https://${REDACTED}@db/x`,
    });
  });

  it('limits the cause depth', () => {
    let error: Error = new Error('level-0');
    for (let level = 1; level <= MAX_ERROR_CAUSE_DEPTH + 2; level += 1) {
      error = new Error(`level-${level}`, { cause: error });
    }

    let node = redact(error) as { cause?: unknown; message?: string };
    let depth = 0;
    while (typeof node.cause === 'object' && node.cause !== null) {
      node = node.cause as { cause?: unknown };
      depth += 1;
    }

    expect(depth).toBe(MAX_ERROR_CAUSE_DEPTH);
    expect(node.cause).toBe('[Truncated]');
  });

  it('handles an error whose cause points back to itself', () => {
    const error = new Error('loop') as Error & { cause?: unknown };
    error.cause = error;

    expect(() => JSON.stringify(redact(error))).not.toThrow();
    expect((redact(error) as { cause: unknown }).cause).toBe('[Circular]');
  });

  it('includes the inner errors of an AggregateError', () => {
    const error = new AggregateError(
      [new Error('a'), new OrderRejectedError('b')],
      'many',
    );

    const out = redact(error) as { errors: Record<string, unknown>[] };

    expect(out.errors).toHaveLength(2);
    expect(out.errors[1]).toMatchObject({ code: 'ORDERS.CHECKOUT.REJECTED' });
  });
});

describe('redact: special values (PLAT-09)', () => {
  it('summarizes binary data instead of one key per byte', () => {
    expect(
      redact({
        buf: Buffer.from('secret-bytes'),
        bytes: new Uint8Array(4),
        raw: new ArrayBuffer(8),
      }),
    ).toEqual({
      buf: '[Binary 12 bytes]',
      bytes: '[Binary 4 bytes]',
      raw: '[Binary 8 bytes]',
    });
  });

  it('turns Map and Set into arrays and redacts sensitive map keys', () => {
    expect(
      redact({
        headers: new Map<string, string>([
          ['authorization', 'Bearer abc'],
          ['accept', 'json'],
        ]),
        tags: new Set(['a', 'b']),
      }),
    ).toEqual({
      headers: [
        ['authorization', REDACTED],
        ['accept', 'json'],
      ],
      tags: ['a', 'b'],
    });
  });

  it('uses toJSON, so a config Secret never leaks', () => {
    expect(redact({ dbPass: new Secret('hunter2'), other: 1 })).toEqual({
      dbPass: REDACTED,
      other: 1,
    });
  });

  it('truncates very deep objects', () => {
    let deep: Record<string, unknown> = { leaf: true };
    for (let level = 0; level < 20; level += 1) {
      deep = { next: deep };
    }

    expect(JSON.stringify(redact(deep))).toContain('[Truncated]');
  });
});
