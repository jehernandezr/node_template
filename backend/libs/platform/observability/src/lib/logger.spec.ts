import { isSensitiveKey, JsonLogger, LogLevel, redact } from './logger.js';
import { RequestContext, type RequestContextData } from './request-context.js';

const FIXED_DATE = new Date('2026-01-02T03:04:05.000Z');
const TRACE_ID = '0af7651916cd43dd8448eb211c80319c';
const DISPLAY_TRACE_ID = '0af76519-16cd-43dd-8448-eb211c80319c';

function setup(
  options: {
    level?: LogLevel;
    debugContexts?: string[];
    context?: string;
  } = {},
) {
  const lines: Record<string, unknown>[] = [];
  const logger = new JsonLogger({
    service: 'svc',
    level: options.level ?? LogLevel.Info,
    debugContexts: options.debugContexts,
    context: options.context,
    sink: (line) => lines.push(JSON.parse(line) as Record<string, unknown>),
    clock: () => FIXED_DATE,
  });
  return { logger, lines };
}

const requestCtx = (
  overrides: Partial<RequestContextData> = {},
): RequestContextData => ({
  traceId: TRACE_ID,
  spanId: 'b7ad6b7169203331',
  debugSampled: false,
  ...overrides,
});

describe('JsonLogger', () => {
  it('writes one JSON object with base fields', () => {
    const { logger, lines } = setup({ context: 'auth' });

    logger.info('user logged in', { count: 2 });

    expect(lines).toEqual([
      {
        timestamp: '2026-01-02T03:04:05.000Z',
        level: 'info',
        service: 'svc',
        context: 'auth',
        message: 'user logged in',
        count: 2,
      },
    ]);
  });

  it('uses the default stdout sink with a trailing newline', () => {
    const spy = jest.spyOn(process.stdout, 'write').mockReturnValue(true);
    try {
      new JsonLogger({ service: 'svc', level: LogLevel.Info }).info('hi');

      expect(spy).toHaveBeenCalledTimes(1);
      const written = spy.mock.calls[0][0] as string;
      expect(written.endsWith('\n')).toBe(true);
      expect(JSON.parse(written)).toMatchObject({ message: 'hi' });
    } finally {
      spy.mockRestore();
    }
  });

  describe('level filtering', () => {
    it('drops lines below the threshold and keeps the rest', () => {
      const { logger, lines } = setup({ level: LogLevel.Warn });

      logger.debug('d');
      logger.info('i');
      logger.warn('w');
      logger.error('e');

      expect(lines.map((l) => l.level)).toEqual(['warn', 'error']);
    });

    it('does not emit debug by default at info level', () => {
      const { logger, lines } = setup({ level: LogLevel.Info });

      logger.debug('d');

      expect(lines).toHaveLength(0);
    });

    it('emits debug when the level is debug', () => {
      const { logger, lines } = setup({ level: LogLevel.Debug });

      logger.debug('d');

      expect(lines).toHaveLength(1);
    });
  });

  describe('debug emission', () => {
    it('emits debug when the context is in debugContexts', () => {
      const { logger, lines } = setup({
        level: LogLevel.Info,
        debugContexts: ['auth', 'reports'],
        context: 'auth',
      });

      logger.debug('auth detail');

      expect(lines).toHaveLength(1);
      expect(lines[0]).toMatchObject({ level: 'debug', context: 'auth' });
    });

    it('does not emit debug for a context outside debugContexts', () => {
      const { logger, lines } = setup({
        level: LogLevel.Info,
        debugContexts: ['auth'],
        context: 'billing',
      });

      logger.debug('billing detail');

      expect(lines).toHaveLength(0);
    });

    it('emits debug when the current request is debugSampled', () => {
      const { logger, lines } = setup({ level: LogLevel.Info });

      RequestContext.run(requestCtx({ debugSampled: true }), () => {
        logger.debug('sampled detail');
      });

      expect(lines).toHaveLength(1);
    });

    it('does not emit debug when the request is not sampled', () => {
      const { logger, lines } = setup({ level: LogLevel.Info });

      RequestContext.run(requestCtx({ debugSampled: false }), () => {
        logger.debug('not sampled');
      });

      expect(lines).toHaveLength(0);
    });
  });

  describe('request context fields', () => {
    it('adds display traceId, spanId, tenantId and userId from RequestContext', () => {
      const { logger, lines } = setup();

      RequestContext.run(requestCtx({ tenantId: 't-1', userId: 'u-1' }), () =>
        logger.info('in request'),
      );

      expect(lines[0]).toMatchObject({
        traceId: DISPLAY_TRACE_ID,
        spanId: 'b7ad6b7169203331',
        tenantId: 't-1',
        userId: 'u-1',
      });
    });

    it('omits trace fields outside a request', () => {
      const { logger, lines } = setup();

      logger.info('no request');

      expect(lines[0]).not.toHaveProperty('traceId');
      expect(lines[0]).not.toHaveProperty('spanId');
      expect(lines[0]).not.toHaveProperty('tenantId');
      expect(lines[0]).not.toHaveProperty('userId');
    });

    it('keeps context across awaits inside the request', async () => {
      const { logger, lines } = setup();

      await RequestContext.run(requestCtx(), async () => {
        await Promise.resolve();
        logger.info('after await');
      });

      expect(lines[0]).toMatchObject({ traceId: DISPLAY_TRACE_ID });
    });
  });

  describe('child bindings', () => {
    it('adds bindings to every line of the child', () => {
      const { logger, lines } = setup();
      const child = logger.child({ module: 'orders', orderId: 'o-1' });

      child.info('created', { total: 10 });

      expect(lines[0]).toMatchObject({
        module: 'orders',
        orderId: 'o-1',
        total: 10,
        message: 'created',
      });
    });

    it('does not add child bindings to the parent logger', () => {
      const { logger, lines } = setup();

      logger.child({ module: 'orders' });
      logger.info('parent');

      expect(lines[0]).not.toHaveProperty('module');
    });

    it('merges nested children bindings', () => {
      const { logger, lines } = setup();

      logger.child({ a: 1 }).child({ b: 2 }).info('m');

      expect(lines[0]).toMatchObject({ a: 1, b: 2 });
    });

    it('applies level filtering to children', () => {
      const { logger, lines } = setup({ level: LogLevel.Error });

      logger.child({ x: 1 }).warn('ignored');

      expect(lines).toHaveLength(0);
    });
  });

  describe('redaction', () => {
    it('redacts sensitive keys in fields case-insensitively', () => {
      const { logger, lines } = setup();

      logger.info('login', {
        Password: 'p',
        accessToken: 't',
        Authorization: 'Bearer x',
        clientSecret: 's',
        apikey: 'k1',
        api_key: 'k2',
        sessionCookie: 'c',
        username: 'ana',
      });

      expect(lines[0]).toMatchObject({
        Password: '[REDACTED]',
        accessToken: '[REDACTED]',
        Authorization: '[REDACTED]',
        clientSecret: '[REDACTED]',
        apikey: '[REDACTED]',
        api_key: '[REDACTED]',
        sessionCookie: '[REDACTED]',
        username: 'ana',
      });
    });

    it('redacts at any depth in objects and arrays', () => {
      const { logger, lines } = setup();

      logger.info('nested', {
        request: {
          headers: { authorization: 'Bearer x', accept: 'json' },
          body: { user: { password: 'p', name: 'ana' } },
        },
        items: [{ token: 't1' }, [{ secret: 's' }]],
      });

      expect(lines[0]).toEqual(
        expect.objectContaining({
          request: {
            headers: { authorization: '[REDACTED]', accept: 'json' },
            body: { user: { password: '[REDACTED]', name: 'ana' } },
          },
          items: [{ token: '[REDACTED]' }, [{ secret: '[REDACTED]' }]],
        }),
      );
    });

    it('never mutates the caller object', () => {
      const { logger } = setup();
      const fields = { nested: { password: 'p', keep: 1 } };

      logger.info('m', fields);

      expect(fields).toEqual({ nested: { password: 'p', keep: 1 } });
    });

    it('redacts child bindings too', () => {
      const { logger, lines } = setup();

      logger.child({ token: 'abc' }).info('m');

      expect(lines[0]).toMatchObject({ token: '[REDACTED]' });
    });

    it('serializes errors to name, message and stack', () => {
      const { logger, lines } = setup();
      const err = new TypeError('bad input');

      logger.error('failed', { err });

      expect(lines[0].err).toEqual({
        name: 'TypeError',
        message: 'bad input',
        stack: err.stack,
      });
    });

    it('handles circular references without throwing', () => {
      const { logger, lines } = setup();
      const obj: Record<string, unknown> = { name: 'loop' };
      obj.self = obj;

      logger.info('circular', { obj });

      expect(lines[0].obj).toEqual({ name: 'loop', self: '[Circular]' });
    });
  });

  describe('redact', () => {
    it('keeps non-sensitive primitives and dates untouched', () => {
      const date = new Date('2026-01-01T00:00:00.000Z');

      expect(redact({ n: 1, b: true, d: date, nil: null })).toEqual({
        n: 1,
        b: true,
        d: '2026-01-01T00:00:00.000Z',
        nil: null,
      });
    });
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
    expect(isSensitiveKey(key)).toBe(true);
  });

  it.each(['tokenCount', 'inputTokens', 'outputTokens', 'userId', 'traceId'])(
    'keeps %s visible',
    (key) => {
      expect(isSensitiveKey(key)).toBe(false);
    },
  );
});
