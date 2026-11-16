import { GetUserProfileOperation } from '@contracts/identity';
import { HttpApplicationSetup } from '@platform/http/nest';
import { HttpTestClient } from '@platform/http/test-utils';
import type { ConfigEnv } from '@platform/config';
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
import { MigrationTarget } from '@platform/service';
import {
  ServiceBootstrap,
  ServiceMigrator,
  type RunningService,
} from '@platform/service/nest';
import { identityService } from '../identity.service.js';
import { IdentityTestServers } from './utils/index.js';

const runtime = new ContainerRuntime(process.env);

runtime.describeIfAvailable('identity app', () => {
  jest.setTimeout(180_000);

  const servers = new IdentityTestServers();
  const migrator = new ServiceMigrator();
  let env: ConfigEnv = {};
  let running: RunningService | undefined;

  beforeAll(async () => {
    await servers.start();
    env = servers.environment();
  });

  afterAll(async () => {
    await running?.stop();
    await servers.stop();
  });

  it('migrates the catalog and then the two shards', async () => {
    const catalog = await migrator.run(
      identityService,
      MigrationTarget.Catalog,
      {
        env,
      },
    );
    await servers.registerShards();
    const shards = await migrator.run(identityService, MigrationTarget.Shards, {
      env,
    });

    expect(catalog.databases).toHaveLength(1);
    expect(shards.databases).toHaveLength(2);
    const names = [...catalog.databases, ...shards.databases].map(
      (report) => report.database,
    );
    expect(new Set(names).size).toBe(3);
    for (const report of [...catalog.databases, ...shards.databases]) {
      expect(report.applied.length).toBeGreaterThan(0);
    }
  });

  it('serves the app with healthy probes', async () => {
    running = await ServiceBootstrap.http(identityService, {
      env,
      http: {
        port: 0,
        host: '127.0.0.1',
        configurer: new HttpApplicationSetup(),
      },
    });
    const client = new HttpTestClient(
      `http://127.0.0.1:${running.address?.port ?? 0}`,
    );

    expect((await client.get('/health/live')).status).toBe(200);
    expect((await client.get('/health/ready')).status).toBe(200);
  });

  it('answers the stubs with the error codes of the pipeline', async () => {
    const client = new HttpTestClient(
      `http://127.0.0.1:${running?.address?.port ?? 0}`,
    );

    const jwks = await client.get('/v1/auth/jwks');
    expect(jwks.status).toBe(500);
    expect(jwks.body).toMatchObject({
      code: 'PLATFORM.INTERNAL.UNEXPECTED',
    });

    const access = await client.get('/v1/me/access');
    expect(access.status).toBe(401);
    expect(access.body).toMatchObject({
      code: 'PLATFORM.AUTH.UNAUTHENTICATED',
    });

    const plainText = await client.post('/v1/auth/sign-in', {
      rawBody: 'x',
      headers: { 'content-type': 'text/plain' },
    });
    expect(plainText.status).toBe(415);
    expect(plainText.body).toMatchObject({
      code: 'PLATFORM.HTTP.UNSUPPORTED_MEDIA_TYPE',
    });

    const foreignOrigin = await client.post('/v1/auth/sign-in', {
      headers: { Origin: 'https://evil.test' },
    });
    expect(foreignOrigin.status).toBe(403);
    expect(foreignOrigin.body).toMatchObject({
      code: 'PLATFORM.AUTH.ORIGIN_REJECTED',
    });
  });

  it('mounts the internal API outside the endpoint guard and checks its signature', async () => {
    const baseUrl = `http://127.0.0.1:${running?.address?.port ?? 0}`;
    const input = { userId: new SequentialIdGenerator().next().toString() };
    const meta = (key: string) => ({
      idempotencyKey: key,
      deadline: Date.now() + 5_000,
      timeoutMs: 5_000,
    });

    const signed = await transportFor(
      baseUrl,
      String(env['INTERNAL_API_SHARED_SECRET']),
    ).invoke(GetUserProfileOperation.id, input, meta('profile-signed'));
    const forged = await transportFor(
      baseUrl,
      'another-secret-of-the-identity-test',
    ).invoke(GetUserProfileOperation.id, input, meta('profile-forged'));

    expect(signed.kind).not.toBe(CallOutcomeKind.Success);
    expect(signed).not.toMatchObject({
      reason: InternalApiReason.Unauthenticated,
    });
    expect(forged).toMatchObject({
      kind: CallOutcomeKind.ProtocolViolation,
      reason: InternalApiReason.Unauthenticated,
    });
  });

  it('stops without hanging', async () => {
    await running?.stop();
    running = undefined;
  });
});

/** Transporte HTTP de la API interna hacia identity, firmado con `secret`. */
function transportFor(baseUrl: string, secret: string): HttpTransport {
  const clock = new SystemClock();
  return new HttpTransport(
    new ServiceBaseUrls({ identity: baseUrl }),
    new HmacSigner(secret, clock),
    new HttpOutcomeReader(new RetryAfterParser(clock)),
    globalThis.fetch,
  );
}
