import { PlatformErrorCode } from '@contracts/platform';
import {
  GetUserProfileOperation,
  IdentityErrorCode,
} from '@contracts/identity';
import {
  HmacSigner,
  HttpOutcomeReader,
  HttpTransport,
  InternalApiReason,
  ServiceBaseUrls,
} from '@platform/internal-api';
import { SystemClock } from '@platform/kernel';
import {
  ContainerRuntime,
  SequentialIdGenerator,
} from '@platform/kernel/test-utils';
import { CallOutcomeKind, RetryAfterParser } from '@platform/primitives';
import { IdentityTestApp } from './utils/index.js';

const runtime = new ContainerRuntime(process.env);

runtime.describeIfAvailable('identity app', () => {
  jest.setTimeout(180_000);

  const app = new IdentityTestApp();

  beforeAll(async () => {
    await app.start();
  });

  afterAll(async () => {
    await app.stop();
  });

  it('serves the app with healthy probes', async () => {
    const client = app.client();

    expect((await client.get('/health/live')).status).toBe(200);
    expect((await client.get('/health/ready')).status).toBe(200);
  });

  it('publishes the JWKS and answers the pipeline errors', async () => {
    const client = app.client();

    const jwks = await client.get('/v1/auth/jwks');
    expect(jwks.status).toBe(200);
    expect(jwks.headers.get('cache-control')).toBe('public, max-age=300');
    expect(jwks.body).toMatchObject({
      keys: [expect.objectContaining({ kty: 'EC', crv: 'P-256' })],
    });

    const access = await client.get('/v1/me/access');
    expect(access.status).toBe(401);
    expect(access.body).toMatchObject({
      code: PlatformErrorCode.AuthUnauthenticated,
    });

    const plainText = await client.post('/v1/auth/sign-in', {
      rawBody: 'x',
      headers: { 'content-type': 'text/plain' },
    });
    expect(plainText.status).toBe(415);

    const foreignOrigin = await client.post('/v1/auth/sign-in', {
      headers: { Origin: 'https://evil.test' },
    });
    expect(foreignOrigin.status).toBe(403);
    expect(foreignOrigin.body).toMatchObject({
      code: PlatformErrorCode.AuthOriginRejected,
    });
  });

  it('runs a signed internal operation up to its handler, with and without a tenant', async () => {
    const env = app.env();
    const transport = transportFor(
      app.baseUrl(),
      String(env['INTERNAL_API_SHARED_SECRET']),
    );
    const input = { userId: new SequentialIdGenerator().next().toString() };

    const withTenant = await transport.invoke(
      GetUserProfileOperation.id,
      input,
      {
        ...meta('profile-with-tenant'),
        tenantId: String(env['IDENTITY_DEFAULT_TENANT_ID']),
      },
    );
    const withoutTenant = await transport.invoke(
      GetUserProfileOperation.id,
      input,
      meta('profile-without-tenant'),
    );

    // The handler ran: it responds that the user does not exist, not that the shard is missing.
    expect(withTenant).toMatchObject({
      kind: CallOutcomeKind.BusinessError,
      code: IdentityErrorCode.UserNotFound,
    });
    expect(withoutTenant).toMatchObject({
      kind: CallOutcomeKind.BusinessError,
      code: IdentityErrorCode.UserNotFound,
    });
  });

  it('rejects an internal call signed with another secret', async () => {
    const forged = await transportFor(
      app.baseUrl(),
      'another-secret-of-the-identity-test',
    ).invoke(
      GetUserProfileOperation.id,
      { userId: new SequentialIdGenerator().next().toString() },
      meta('profile-forged'),
    );

    expect(forged).toMatchObject({
      kind: CallOutcomeKind.ProtocolViolation,
      reason: InternalApiReason.Unauthenticated,
    });
  });
});

function meta(key: string): {
  idempotencyKey: string;
  deadline: number;
  timeoutMs: number;
} {
  return {
    idempotencyKey: key,
    deadline: Date.now() + 20_000,
    timeoutMs: 20_000,
  };
}

/** HTTP transport of the internal API towards identity, signed with `secret`. */
function transportFor(baseUrl: string, secret: string): HttpTransport {
  const clock = new SystemClock();
  return new HttpTransport(
    new ServiceBaseUrls({ identity: baseUrl }),
    new HmacSigner(secret, clock),
    new HttpOutcomeReader(new RetryAfterParser(clock)),
    globalThis.fetch,
  );
}
