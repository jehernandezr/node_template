import { Secret } from '@platform/config';
import { PlatformError } from '@platform/kernel';
import { RedactionRules } from '../redaction-rules.js';
import { Redactor } from '../redactor.js';

const R = '[REDACTED]';

class OrderRejectedError extends PlatformError {
  readonly code = 'ORDERS.CHECKOUT.REJECTED';
}

describe('Redactor', () => {
  const redactor = new Redactor();

  describe('isSensitiveKey (extended)', () => {
    it.each([
      'privateKey',
      'private_key',
      'jwt',
      'idJwt',
      'jwtToken',
      'bearer',
      'bearerToken',
      'authorization',
      'cookie',
      'setCookie',
      'session',
      'session_token',
      'tokenHash',
      'codeHmac',
      'passwordHash',
      'otp',
      'userOtp',
      'otpCode',
      'password',
      'secret',
      'token',
      'apiKey',
      'x-api-key',
    ])('flags %s', (key) => {
      expect(redactor.isSensitiveKey(key)).toBe(true);
    });

    it.each([
      'tokenCount',
      'inputTokens',
      'keyCount',
      'publicKeyId',
      'hotpot',
      'username',
      'secretary',
      'cookieCount',
    ])('keeps %s (word position, not substring)', (key) => {
      expect(redactor.isSensitiveKey(key)).toBe(false);
    });

    it.each([
      'sessionId',
      'activeSessions',
      'sessionCount',
      'passwordChangedAt',
      'cookieConsent',
      'apiKeyId',
      'contentHash',
    ])('keeps %s (ids, instants, counts and public descriptors)', (key) => {
      expect(redactor.isSensitiveKey(key)).toBe(false);
    });
  });

  describe('isSensitiveKey: one-time codes and card data', () => {
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
      expect(redactor.isSensitiveKey(key)).toBe(true);
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
      expect(redactor.isSensitiveKey(key)).toBe(false);
    });
  });

  describe('isSensitiveKey', () => {
    it.each([
      'password',
      'accessToken',
      'refresh_token',
      'Authorization',
      'x-api-key',
      'apiKey',
      'set-cookie',
      'passwordHash',
      'clientSecret',
      'webhookSignature',
    ])('treats %s as sensitive', (key) => {
      expect(redactor.isSensitiveKey(key)).toBe(true);
    });

    it.each(['tokenCount', 'inputTokens', 'outputTokens', 'userId', 'traceId'])(
      'keeps %s visible',
      (key) => {
        expect(redactor.isSensitiveKey(key)).toBe(false);
      },
    );
  });

  describe('redactString', () => {
    it('masks credentials embedded in URLs', () => {
      expect(
        redactor.redactString(
          'connect https://user:pass@db.example.com:5432/x',
        ),
      ).toBe(`connect https://${R}@db.example.com:5432/x`);
      expect(redactor.redactString('postgres://admin:s3cr3t@host/db')).toBe(
        `postgres://${R}@host/db`,
      );
      expect(redactor.redactString('https://example.com/a@b')).toBe(
        'https://example.com/a@b',
      );
    });

    it('masks sensitive query params and keeps the rest', () => {
      expect(
        redactor.redactString('GET /cb?code=abc123&state=ok&token=xyz'),
      ).toBe(`GET /cb?code=${R}&state=ok&token=${R}`);
      expect(redactor.redactString('/x?access_token=a&page=2&apiKey=k')).toBe(
        `/x?access_token=${R}&page=2&apiKey=${R}`,
      );
      expect(redactor.redactString('/x?tokenCount=3&codex=1')).toBe(
        '/x?tokenCount=3&codex=1',
      );
    });

    it('masks bearer values, JWTs and PEM private keys', () => {
      expect(redactor.redactString('header Bearer abc.def-123')).toBe(
        `header Bearer ${R}`,
      );
      const jwt = [
        'eyJhbGciOiJIUzI1NiJ9',
        'eyJzdWIiOiIxMjM0NTY3ODkwIn0',
        'c2lnbmF0dXJl',
      ].join('.');
      expect(redactor.redactString(`jwt=${jwt} end`)).not.toContain('eyJ');
      expect(redactor.redactString(`got ${jwt}`)).toBe(`got ${R}`);
      const pem =
        '-----BEGIN PRIVATE KEY-----\nMIIabc\n-----END PRIVATE KEY----- tail';
      expect(redactor.redactString(pem)).toBe(`${R} tail`);
    });

    it('masks one-time codes in query strings', () => {
      expect(
        redactor.redactString('/verify?mfa_code=123456&pin=0000&page=2'),
      ).toBe(`/verify?mfa_code=${R}&pin=${R}&page=2`);
    });

    it('leaves ordinary text untouched', () => {
      expect(redactor.redactString('user logged in at 10:30')).toBe(
        'user logged in at 10:30',
      );
    });
  });

  describe('redact', () => {
    it('keeps non-sensitive primitives and dates untouched', () => {
      const date = new Date('2026-01-01T00:00:00.000Z');

      expect(redactor.redact({ n: 1, b: true, d: date, nil: null })).toEqual({
        n: 1,
        b: true,
        d: '2026-01-01T00:00:00.000Z',
        nil: null,
      });
    });

    it('scrubs strings at any depth and error messages', () => {
      const out = redactor.redact({
        url: 'https://u:p@h/x?token=t',
        list: ['a?code=9'],
        err: new Error('failed calling https://u:p@h/x'),
        privateKey: 'k',
        session: { id: 's' },
      }) as Record<string, unknown>;

      expect(out.url).toBe(`https://${R}@h/x?token=${R}`);
      expect(out.list).toEqual([`a?code=${R}`]);
      expect((out.err as { message: string }).message).toBe(
        `failed calling https://${R}@h/x`,
      );
      expect(out.privateKey).toBe(R);
      expect(out.session).toBe(R);
    });

    it('serializes plain errors to name, message and stack', () => {
      const err = new TypeError('bad input');

      expect(redactor.redact({ err })).toEqual({
        err: { name: 'TypeError', message: 'bad input', stack: err.stack },
      });
    });

    it('handles circular references without throwing', () => {
      const obj: Record<string, unknown> = { name: 'loop' };
      obj.self = obj;

      expect(redactor.redact({ obj })).toEqual({
        obj: { name: 'loop', self: '[Circular]' },
      });
    });

    it('does not mutate the caller object', () => {
      const fields = { nested: { password: 'p', keep: 1 } };

      redactor.redact(fields);

      expect(fields).toEqual({ nested: { password: 'p', keep: 1 } });
    });

    it('redacts sensitive keys in objects and arrays at any depth', () => {
      expect(
        redactor.redact({
          request: {
            headers: { authorization: 'Bearer x', accept: 'json' },
            body: { user: { password: 'p', name: 'ana' } },
          },
          items: [{ token: 't1' }, [{ secret: 's' }]],
        }),
      ).toEqual({
        request: {
          headers: { authorization: R, accept: 'json' },
          body: { user: { password: R, name: 'ana' } },
        },
        items: [{ token: R }, [{ secret: R }]],
      });
    });

    it('applies the sensitive-key check case-insensitively to fields', () => {
      expect(
        redactor.redact({
          Password: 'p',
          accessToken: 't',
          Authorization: 'Bearer x',
          clientSecret: 's',
          apikey: 'k1',
          api_key: 'k2',
          sessionCookie: 'c',
          username: 'ana',
        }),
      ).toEqual({
        Password: R,
        accessToken: R,
        Authorization: R,
        clientSecret: R,
        apikey: R,
        api_key: R,
        sessionCookie: R,
        username: 'ana',
      });
    });

    it('uses the custom rules of the constructor', () => {
      const custom = new Redactor(
        RedactionRules.defaults().extend(['passport']),
      );
      const standard = new Redactor();

      expect(custom.redact({ passport: 'X1' })).toEqual({ passport: R });
      expect(standard.redact({ passport: 'X1' })).toEqual({ passport: 'X1' });
    });
  });

  describe('redact: errors', () => {
    it('keeps code, retryable and sanitized details of a PlatformError', () => {
      const error = new OrderRejectedError('order rejected', {
        details: { orderId: 'o-1', verificationCode: '123456', token: 't' },
        retryable: true,
      });

      const out = redactor.redact(error) as Record<string, unknown>;

      expect(out).toMatchObject({
        name: 'OrderRejectedError',
        message: 'order rejected',
        code: 'ORDERS.CHECKOUT.REJECTED',
        retryable: true,
        details: {
          orderId: 'o-1',
          verificationCode: R,
          token: R,
        },
      });
      expect(typeof out['stack']).toBe('string');
    });

    it('serializes the cause chain with redaction', () => {
      const root = Object.assign(new Error('connect https://u:p@db/x'), {
        code: 'ECONNRESET',
      });
      const error = new OrderRejectedError('wrapped', { cause: root });

      const out = redactor.redact(error) as { cause: Record<string, unknown> };

      expect(out.cause).toMatchObject({
        name: 'Error',
        code: 'ECONNRESET',
        message: `connect https://${R}@db/x`,
      });
    });

    it('limits the cause depth to three levels', () => {
      const error = new Error('level-5', {
        cause: new Error('level-4', {
          cause: new Error('level-3', {
            cause: new Error('level-2', {
              cause: new Error('level-1', {
                cause: new Error('level-0'),
              }),
            }),
          }),
        }),
      });

      expect(redactor.redact(error)).toMatchObject({
        message: 'level-5',
        cause: {
          message: 'level-4',
          cause: {
            message: 'level-3',
            cause: {
              message: 'level-2',
              cause: '[Truncated]',
            },
          },
        },
      });
    });

    it('handles an error whose cause points back to itself', () => {
      const error = new Error('loop') as Error & { cause?: unknown };
      error.cause = error;

      expect(() => JSON.stringify(redactor.redact(error))).not.toThrow();
      expect((redactor.redact(error) as { cause: unknown }).cause).toBe(
        '[Circular]',
      );
    });

    it('includes the inner errors of an AggregateError', () => {
      const error = new AggregateError(
        [new Error('a'), new OrderRejectedError('b')],
        'many',
      );

      const out = redactor.redact(error) as {
        errors: Record<string, unknown>[];
      };

      expect(out.errors).toHaveLength(2);
      expect(out.errors[1]).toMatchObject({ code: 'ORDERS.CHECKOUT.REJECTED' });
    });
  });

  describe('redact: special values', () => {
    it('summarizes binary data instead of one key per byte', () => {
      expect(
        redactor.redact({
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
        redactor.redact({
          headers: new Map<string, string>([
            ['authorization', 'Bearer abc'],
            ['accept', 'json'],
          ]),
          tags: new Set(['a', 'b']),
        }),
      ).toEqual({
        headers: [
          ['authorization', R],
          ['accept', 'json'],
        ],
        tags: ['a', 'b'],
      });
    });

    it('uses toJSON, so a config Secret never leaks', () => {
      expect(
        redactor.redact({ dbPass: new Secret('hunter2'), other: 1 }),
      ).toEqual({
        dbPass: R,
        other: 1,
      });
    });

    it('truncates very deep objects', () => {
      const deep = Array.from({ length: 20 }).reduce<Record<string, unknown>>(
        (inner) => ({ next: inner }),
        { leaf: true },
      );

      expect(JSON.stringify(redactor.redact(deep))).toContain('[Truncated]');
    });
  });
});
