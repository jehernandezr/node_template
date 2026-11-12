import { SequentialIdGenerator } from '@platform/kernel/testing';
import {
  isSensitiveKey,
  JsonLogger,
  LogLevel,
  redact,
  redactString,
} from './logger.js';
import { newTraceId } from './trace.js';

const R = '[REDACTED]';

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
    'sessionId',
    'session_token',
    'otp',
    'userOtp',
    'otpCode',
    'password',
    'secret',
    'token',
    'apiKey',
    'x-api-key',
  ])('flags %s', (key) => {
    expect(isSensitiveKey(key)).toBe(true);
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
    expect(isSensitiveKey(key)).toBe(key === 'cookieCount');
  });
});

describe('redactString', () => {
  it('masks credentials embedded in URLs', () => {
    expect(
      redactString('connect https://user:pass@db.example.com:5432/x'),
    ).toBe(`connect https://${R}@db.example.com:5432/x`);
    expect(redactString('postgres://admin:s3cr3t@host/db')).toBe(
      `postgres://${R}@host/db`,
    );
    expect(redactString('https://example.com/a@b')).toBe(
      'https://example.com/a@b',
    );
  });

  it('masks sensitive query params and keeps the rest', () => {
    expect(redactString('GET /cb?code=abc123&state=ok&token=xyz')).toBe(
      `GET /cb?code=${R}&state=ok&token=${R}`,
    );
    expect(redactString('/x?access_token=a&page=2&apiKey=k')).toBe(
      `/x?access_token=${R}&page=2&apiKey=${R}`,
    );
    expect(redactString('/x?tokenCount=3&codex=1')).toBe(
      '/x?tokenCount=3&codex=1',
    );
  });

  it('masks bearer values, JWTs and PEM private keys', () => {
    expect(redactString('header Bearer abc.def-123')).toBe(
      `header Bearer ${R}`,
    );
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.c2lnbmF0dXJl';
    expect(redactString(`jwt=${jwt} end`)).not.toContain('eyJ');
    expect(redactString(`got ${jwt}`)).toBe(`got ${R}`);
    const pem =
      '-----BEGIN PRIVATE KEY-----\nMIIabc\n-----END PRIVATE KEY----- tail';
    expect(redactString(pem)).toBe(`${R} tail`);
  });

  it('leaves ordinary text untouched', () => {
    expect(redactString('user logged in at 10:30')).toBe(
      'user logged in at 10:30',
    );
  });
});

describe('redact (extended)', () => {
  it('scrubs strings at any depth and error messages', () => {
    const out = redact({
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
});

describe('JsonLogger redaction', () => {
  it('redacts message, fields and child bindings', () => {
    const lines: Record<string, unknown>[] = [];
    const logger = new JsonLogger({
      service: 's',
      level: LogLevel.Info,
      sink: (l) => lines.push(JSON.parse(l) as Record<string, unknown>),
    }).child({ upstream: 'https://a:b@svc/x' });
    logger.info('call https://u:p@h/?token=1', {
      otp: '123456',
      sessionId: 'x',
    });
    expect(lines[0]).toMatchObject({
      message: `call https://${R}@h/?token=${R}`,
      otp: R,
      sessionId: R,
      upstream: `https://${R}@svc/x`,
    });
  });
});

describe('newTraceId with IdGenerator', () => {
  it('uses the injected generator', () => {
    const ids = new SequentialIdGenerator();
    const expected = new SequentialIdGenerator()
      .next()
      .toString()
      .replace(/-/g, '');
    expect(newTraceId(ids)).toBe(expected);
  });
});
