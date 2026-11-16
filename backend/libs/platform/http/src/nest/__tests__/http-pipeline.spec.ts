import {
  AuthMethodReference,
  Permission,
  RevocationReason,
} from '@contracts/identity';
import {
  defineRoute,
  defineServiceContract,
  HttpMethod,
  Access,
} from '@contracts/platform';
import { Endpoint } from '../endpoint.decorator.js';
import { Resource } from '../resource.decorator.js';
import { HttpTestApp } from './utils/http-test-app.js';
import {
  demoContract,
  DemoErrorCode,
  DemoResource,
  ListItemsRoute,
  ErrorsController,
  HealthLikeController,
  ItemsController,
  MeController,
  SessionController,
  StartedHttpTestApp,
  TEST_TENANT_ID,
  TEST_USER_ID,
  UnavailableController,
} from './utils/index.js';

const CONTROLLERS = [
  ItemsController,
  MeController,
  SessionController,
  ErrorsController,
  HealthLikeController,
  UnavailableController,
];
const ONE_HOUR_AGO = (): number => Math.floor(Date.now() / 1000) - 3600;

describe('HTTP pipeline', () => {
  let app: StartedHttpTestApp;

  beforeAll(async () => {
    app = await HttpTestApp.start({
      controllers: CONTROLLERS,
      contract: demoContract,
    });
  });

  afterAll(async () => {
    await app.stop();
  });

  describe('contract input and output', () => {
    it('creates an item from a valid body with 201', async () => {
      const response = await app.client.post('/v1/items', {
        body: { name: 'Lapiz' },
      });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({ id: expect.any(String), name: 'Lapiz' });
    });

    it('rejects an invalid body with the field errors', async () => {
      const response = await app.client.post('/v1/items', {
        body: { name: '' },
      });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        code: 'PLATFORM.VALIDATION.INVALID_INPUT',
        errors: [{ field: 'name', code: 'PLATFORM.VALIDATION.TOO_SHORT' }],
      });
    });

    it('decodes a numeric query parameter', async () => {
      const response = await app.client.get('/v1/items?limit=5');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ limit: 5 });
    });
  });

  describe('authentication', () => {
    it('rejects a request without credentials', async () => {
      const response = await app.client.get('/v1/me');

      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        code: 'PLATFORM.AUTH.UNAUTHENTICATED',
      });
    });

    it('accepts a valid access token and returns the actor', async () => {
      const token = await app.tokenFor({ claims: { sub: TEST_USER_ID } });
      const response = await app.client.get('/v1/me', {
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ userId: TEST_USER_ID });
    });

    it('rejects an expired access token', async () => {
      const iat = ONE_HOUR_AGO();
      const token = await app.tokenFor({
        claims: { iat, auth_time: iat, exp: iat + 600 },
      });
      const response = await app.client.get('/v1/me', {
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        code: 'PLATFORM.AUTH.TOKEN_EXPIRED',
      });
    });

    it('rejects a revoked session', async () => {
      const sid = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9a09';
      const token = await app.tokenFor({ claims: { sid } });
      await app.authState.revokeSession(sid, 60_000, RevocationReason.Logout);
      const response = await app.client.get('/v1/me', {
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({ code: 'IDENTITY.SESSION.REVOKED' });
    });

    it('accepts a valid API key on a route that allows it', async () => {
      const key = await app.seedApiKey();
      const response = await app.client.get('/v1/api-key-items', {
        headers: { authorization: `Bearer ${key}` },
      });

      expect(response.status).toBe(200);
    });

    it('rejects a session token sent as a bearer credential', async () => {
      const response = await app.client.get('/v1/me', {
        headers: { authorization: 'Bearer st1_0123456789abcdef' },
      });

      expect(response.status).toBe(401);
    });
  });

  describe('authorization', () => {
    it('forbids a route whose permission the actor lacks', async () => {
      const token = await app.tokenFor();
      const response = await app.client.get('/v1/secret', {
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.status).toBe(403);
      expect(response.body).toMatchObject({ code: 'PLATFORM.AUTH.FORBIDDEN' });
    });

    it('allows a route when the actor has the permission', async () => {
      const token = await app.tokenFor({ permissions: [Permission.TasksRead] });
      const response = await app.client.get('/v1/secret', {
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.status).toBe(200);
    });

    it('asks for step-up when the second factor is missing', async () => {
      const token = await app.tokenFor({
        claims: { amr: [AuthMethodReference.Password] },
      });
      const response = await app.client.post('/v1/dangerous', {
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.status).toBe(403);
      expect(response.body).toMatchObject({
        code: 'IDENTITY.MFA.STEP_UP_REQUIRED',
      });
    });

    it('allows a route with a recent second factor', async () => {
      const token = await app.tokenFor({
        claims: {
          amr: [AuthMethodReference.Password, AuthMethodReference.Totp],
          auth_time: Math.floor(Date.now() / 1000),
        },
      });
      const response = await app.client.post('/v1/dangerous', {
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.status).toBe(204);
    });
  });

  describe('origin policy and CORS', () => {
    it('rejects an origin that is not allowed', async () => {
      const response = await app.client.get('/v1/items?limit=1', {
        headers: { origin: 'https://evil.test' },
      });

      expect(response.status).toBe(403);
      expect(response.body).toMatchObject({
        code: 'PLATFORM.AUTH.ORIGIN_REJECTED',
      });
    });

    it('answers CORS headers for an allowed origin', async () => {
      const response = await app.client.get('/v1/items?limit=1', {
        headers: { origin: 'https://app.test' },
      });

      expect(response.headers.get('access-control-allow-origin')).toBe(
        'https://app.test',
      );
      expect(response.headers.get('access-control-allow-credentials')).toBe(
        'true',
      );
    });

    it('accepts a request without origin', async () => {
      const response = await app.client.get('/v1/items?limit=1');

      expect(response.status).toBe(200);
    });
  });

  describe('session cookie and native transport', () => {
    it('sets the session cookie on the web channel and omits the token from the body', async () => {
      const response = await app.client.post('/v1/auth/session');
      const cookie = response.headers.get('set-cookie') ?? '';

      expect(response.status).toBe(201);
      expect(response.body).not.toHaveProperty('sessionToken');
      expect(cookie).toMatch(
        /^__Host-session=st1_[0-9a-f]+; Max-Age=86400; Path=\/; HttpOnly; Secure; SameSite=Strict$/,
      );
      expect(cookie).not.toContain('Domain');
    });

    it('returns the session token in the body on the native channel', async () => {
      const response = await app.client.post('/v1/auth/session', {
        headers: { 'x-session-transport': 'bearer' },
      });

      expect(response.body).toMatchObject({
        sessionToken: expect.stringMatching(/^st1_/),
      });
      expect(response.headers.get('set-cookie')).toBeNull();
    });

    it('reads the session token from the cookie when rotating', async () => {
      const response = await app.client
        .withHeaders({ cookie: '__Host-session=st1_abc' })
        .post('/v1/auth/session/refresh');

      expect(response.status).toBe(200);
      expect(response.body).not.toHaveProperty('sessionToken');
      expect(response.headers.get('set-cookie')).toContain(
        '__Host-session=st1_abc',
      );
    });

    it('does not set a cookie when the rotated response has no session token', async () => {
      const response = await app.client.post('/v1/auth/session/refresh', {
        body: {},
      });

      expect(response.status).toBe(200);
      expect(response.headers.get('set-cookie')).toBeNull();
    });

    it('clears the session cookie on sign-out', async () => {
      const response = await app.client
        .withHeaders({ cookie: '__Host-session=st1_abc' })
        .post('/v1/auth/session/sign-out');

      expect(response.status).toBe(204);
      expect(response.headers.get('set-cookie')).toContain('Max-Age=0');
    });
  });

  describe('body policy', () => {
    it('answers 400 MALFORMED_BODY for broken JSON', async () => {
      const response = await app.client.post('/v1/items', {
        headers: { 'content-type': 'application/json' },
        rawBody: '{"name":',
      });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        code: 'PLATFORM.HTTP.MALFORMED_BODY',
      });
      expect(response.headers.get('x-trace-id')).not.toBeNull();
    });

    it('answers 413 for a body above the limit', async () => {
      const response = await app.client.post('/v1/items', {
        body: { name: 'x'.repeat(300 * 1024) },
      });

      expect(response.status).toBe(413);
      expect(response.body).toMatchObject({
        code: 'PLATFORM.HTTP.PAYLOAD_TOO_LARGE',
      });
    });

    it('answers 415 for a body that is not JSON', async () => {
      const response = await app.client.post('/v1/items', {
        headers: { 'content-type': 'text/plain' },
        rawBody: 'hola',
      });

      expect(response.status).toBe(415);
      expect(response.body).toMatchObject({
        code: 'PLATFORM.HTTP.UNSUPPORTED_MEDIA_TYPE',
      });
    });
  });

  describe('versions and deprecation', () => {
    it('echoes a supported API version', async () => {
      const response = await app.client.get('/v1/items?limit=1', {
        headers: { 'api-version': '2026-11-01' },
      });

      expect(response.headers.get('api-version')).toBe('2026-11-01');
    });

    it('rejects an unsupported API version', async () => {
      const response = await app.client.get('/v1/items?limit=1', {
        headers: { 'api-version': '1999-01-01' },
      });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        code: 'PLATFORM.API.UNSUPPORTED_VERSION',
      });
    });

    it('sends the deprecation, sunset and successor headers', async () => {
      const response = await app.client.get('/v1/old-items');

      expect(response.headers.get('deprecation')).toMatch(/^@\d+$/);
      expect(response.headers.get('sunset')).toBe(
        'Thu, 01 Jan 2099 00:00:00 GMT',
      );
      expect(response.headers.get('link')).toBe(
        '</v1/items>; rel="successor-version"',
      );
    });

    it('answers 410 once the sunset date has passed', async () => {
      const response = await app.client.get('/v1/gone-items');

      expect(response.status).toBe(410);
      expect(response.body).toMatchObject({
        code: 'PLATFORM.API.VERSION_SUNSET',
      });
    });
  });

  describe('headers and trace', () => {
    it('sends security headers on every response, including errors', async () => {
      const ok = await app.client.get('/v1/items?limit=1');
      const missing = await app.client.get('/v1/nope');

      for (const response of [ok, missing]) {
        expect(response.headers.get('strict-transport-security')).toContain(
          'max-age=',
        );
        expect(response.headers.get('x-content-type-options')).toBe('nosniff');
        expect(response.headers.get('referrer-policy')).toBe('no-referrer');
        expect(response.headers.get('content-security-policy')).toBe(
          "default-src 'none'",
        );
      }
    });

    it('sends no-store on the auth routes only', async () => {
      const auth = await app.client.post('/v1/auth/limited');
      const items = await app.client.get('/v1/items?limit=1');

      expect(auth.headers.get('cache-control')).toBe('no-store');
      expect(items.headers.get('cache-control')).toBeNull();
    });

    it('does not expose x-powered-by', async () => {
      const response = await app.client.get('/v1/items?limit=1');

      expect(response.headers.get('x-powered-by')).toBeNull();
    });

    it('answers 404 for an unknown route with a trace id', async () => {
      const response = await app.client.get('/v1/nope');

      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({
        code: 'PLATFORM.RESOURCE.NOT_FOUND',
      });
      expect(response.headers.get('x-trace-id')).not.toBeNull();
    });

    it('answers 404 for the root path with a trace id', async () => {
      const response = await app.client.get('/');

      expect(response.status).toBe(404);
      expect(response.headers.get('x-trace-id')).not.toBeNull();
    });

    it('answers 500 for an unexpected error without its message', async () => {
      const response = await app.client.get('/v1/boom');

      expect(response.status).toBe(500);
      expect(response.body).toMatchObject({
        code: 'PLATFORM.INTERNAL.UNEXPECTED',
      });
      expect(response.text).not.toContain('internal detail');
    });

    it('maps a service error code through the catalog', async () => {
      const response = await app.client.post('/v1/conflicts');

      expect(response.status).toBe(409);
      expect(response.body).toMatchObject({ code: DemoErrorCode.ItemConflict });
    });

    it('puts the trace id of the request in the problem body', async () => {
      const response = await app.client.get('/v1/nope');

      expect(response.body).toMatchObject({
        traceId: response.headers.get('x-trace-id'),
      });
    });

    it('gives the handler the tenant and user of the request context', async () => {
      const token = await app.tokenFor({ claims: { sub: TEST_USER_ID } });
      const response = await app.client.get('/v1/me', {
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.body).toMatchObject({
        userId: TEST_USER_ID,
        tenantId: TEST_TENANT_ID,
      });
    });
  });

  describe('timeouts and plain controllers', () => {
    it('answers 504 when the handler exceeds its time limit', async () => {
      const response = await app.client.get('/v1/slow');

      expect(response.status).toBe(504);
      expect(response.body).toMatchObject({
        code: 'PLATFORM.RESILIENCE.TIMEOUT',
      });
    });

    it('serves a controller without @Endpoint without a token', async () => {
      const response = await app.client.get('/health-like');

      expect(response.status).toBe(200);
    });

    it('returns the body of a 503 as it was thrown', async () => {
      const response = await app.client.get('/unavailable');

      expect(response.status).toBe(503);
      expect(response.body).toEqual({ status: 'down' });
    });
  });
});

describe('HTTP pipeline rate limit', () => {
  it('answers 429 with Retry-After after twenty attempts on an auth route', async () => {
    const app = await HttpTestApp.start({
      controllers: CONTROLLERS,
      contract: demoContract,
    });
    try {
      for (let attempt = 0; attempt < 20; attempt++) {
        await app.client.post('/v1/auth/limited');
      }
      const limited = await app.client.post('/v1/auth/limited');

      expect(limited.status).toBe(429);
      expect(limited.body).toMatchObject({
        code: 'PLATFORM.RATE_LIMIT.EXCEEDED',
      });
      expect(Number(limited.headers.get('retry-after'))).toBeGreaterThanOrEqual(
        1,
      );
    } finally {
      await app.stop();
    }
  });
});

describe('HTTP pipeline output validation', () => {
  it('answers 500 when the response breaks its contract and validation is on', async () => {
    const app = await HttpTestApp.start({
      controllers: CONTROLLERS,
      contract: demoContract,
      validateOutput: true,
    });
    try {
      const response = await app.client.get('/v1/bad-output');

      expect(response.status).toBe(500);
      expect(response.body).toMatchObject({
        code: 'PLATFORM.INTERNAL.UNEXPECTED',
      });
    } finally {
      await app.stop();
    }
  });

  it('answers 200 with the same response when validation is off', async () => {
    const app = await HttpTestApp.start({
      controllers: CONTROLLERS,
      contract: demoContract,
      validateOutput: false,
    });
    try {
      const response = await app.client.get('/v1/bad-output');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ ok: 'yes' });
    } finally {
      await app.stop();
    }
  });
});

describe('HTTP pipeline startup', () => {
  const extraRoute = defineRoute({
    id: 'demo.missing.get',
    method: HttpMethod.Get,
    path: '/v1/missing',
    access: Access.public(),
    description: 'Ruta sin handler.',
  });

  it('refuses to start when a contract route has no handler', async () => {
    const contract = defineServiceContract({
      service: 'demo',
      description: 'Contrato con una ruta sin handler.',
      routes: { ...demoContract.routes, missing: extraRoute },
      errors: demoContract.errors,
      enums: demoContract.enums,
    });

    await expect(
      HttpTestApp.start({ controllers: CONTROLLERS, contract }),
    ).rejects.toThrow('demo.missing.get');
  });

  it('refuses to start when two handlers share a method and path', async () => {
    @Resource(DemoResource.Items)
    class DuplicatedController {
      @Endpoint(ListItemsRoute)
      first() {
        return { limit: 1 };
      }

      @Endpoint(ListItemsRoute)
      second() {
        return { limit: 1 };
      }
    }

    await expect(
      HttpTestApp.start({
        controllers: [DuplicatedController],
        contract: demoContract,
      }),
    ).rejects.toThrow('GET /v1/items');
  });

  it('refuses to start when a route error code has no catalog entry', async () => {
    const uncovered = defineRoute({
      id: 'demo.uncovered.get',
      method: HttpMethod.Get,
      path: '/v1/uncovered',
      errors: ['DEMO.OTHER.CODE'],
      access: Access.public(),
      description: 'Ruta con un código sin catálogo.',
    });
    const contract = defineServiceContract({
      service: 'demo',
      description: 'Contrato con un código sin catálogo.',
      routes: { uncovered },
    });
    @Resource(DemoResource.Errors)
    class UncoveredController {
      @Endpoint(uncovered)
      get() {
        return undefined;
      }
    }

    await expect(
      HttpTestApp.start({ controllers: [UncoveredController], contract }),
    ).rejects.toThrow('DEMO.OTHER.CODE');
  });
});
