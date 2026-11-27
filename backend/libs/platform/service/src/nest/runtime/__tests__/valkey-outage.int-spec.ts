import { PollUntil, ValkeyOutage } from '@platform/adapters-valkey/test-utils';
import { cacheAsideToken } from '@platform/cache/nest';
import type { CacheAside } from '@platform/cache';
import { HealthState } from '@platform/kernel';
import { ContainerRuntime } from '@platform/kernel/test-utils';
import { RateLimitRule, RateLimiter } from '@platform/rate-limit';
import { JobRunner } from '@platform/scheduling';
import {
  ShardAccess,
  ShardKey,
  ShardRouter,
  ShardingErrorCode,
  TenantWriteWaiter,
} from '@platform/sharding';
import {
  ServiceDefinitionBuilder,
  ServiceTestApp,
  ServiceTestServers,
} from '../../../__tests__/utils/index.js';
import { HttpApplicationConfigurer } from '../../bootstrap/http-application-configurer.js';
import { HealthRoute } from '../../health/health-route.enum.js';
import {
  OutageProbeCache,
  OutageProbeJob,
  OutageProbeJobName,
  OutageProbeRootModule,
  runtimeProbeContract,
} from './utils/index.js';

jest.setTimeout(240_000);

const runtime = new ContainerRuntime(process.env);

/** Leaves the HTTP application as Nest creates it: the probe service has no HTTP contract. */
class PlainHttpSetup extends HttpApplicationConfigurer {
  override configure(): Promise<void> {
    return Promise.resolve();
  }
}

interface ReadySummary {
  readonly state: HealthState;
  readonly checks: Readonly<Record<string, { readonly state: HealthState }>>;
}

const TENANT = '0193f1c2-0000-7000-8000-0000000000c3';
const RULE = RateLimitRule.define({
  name: 'outage-probe',
  limit: 3,
  windowMs: 60_000,
});
const RECOVERY_MS = 30_000;

runtime.describeIfAvailable('a service while Valkey is down', () => {
  const servers = new ServiceTestServers(runtimeProbeContract.service);
  const outage = new ValkeyOutage(() => ({
    host: servers.valkey.host,
    port: servers.valkey.port,
  }));
  const app = new ServiceTestApp({
    definition: ServiceDefinitionBuilder.aDefinition(
      runtimeProbeContract.service,
    )
      .with({
        contract: runtimeProbeContract,
        rootModule: OutageProbeRootModule,
      })
      .build(),
    servers,
    configurer: new PlainHttpSetup(),
    tenants: { [TENANT]: 0 },
  });
  const read = {
    tenantId: TENANT,
    keyKind: ShardKey.Tenant,
    access: ShardAccess.Read,
  };

  const ready = async (): Promise<{
    status: number;
    summary: ReadySummary;
  }> => {
    const response = await app
      .client()
      .get(`/${HealthRoute.Base}/${HealthRoute.Ready}`);
    return { status: response.status, summary: response.body as ReadySummary };
  };

  beforeAll(async () => {
    await outage.start();
    await app.start({
      ...outage.environment(),
      TENANT_WRITE_GATE: 'valkey',
      TENANT_MOVE_MAX_WAIT_MS: '300',
    });
    await app.get(ShardRouter).resolve(read);
    outage.begin();
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await ready();
    }
  });

  afterAll(async () => {
    outage.end();
    await app.stop();
    await outage.stop();
  });

  it('stays ready and reports Valkey as degraded', async () => {
    const { status, summary } = await ready();

    expect(status).toBe(200);
    expect(summary.checks['valkey']).toMatchObject({
      state: HealthState.Degraded,
    });
  });

  it('reads through the cache from the loader', async () => {
    const cache = app
      .service()
      .app.get<CacheAside>(cacheAsideToken(OutageProbeCache.Namespace), {
        strict: false,
      });

    await expect(
      cache.getOrLoad({
        namespace: ['probe'],
        params: { id: 1 },
        ttlMs: 60_000,
        load: () => Promise.resolve('from the database'),
      }),
    ).resolves.toBe('from the database');
  });

  it('limits each key in the process instead of rejecting or letting everything through', async () => {
    const limiter = app.get(RateLimiter);
    const results = [];
    for (let attempt = 0; attempt < 4; attempt += 1) {
      results.push((await limiter.consume('caller', RULE)).allowed);
    }

    expect(results).toEqual([true, true, true, false]);
  });

  it('skips an exclusive job, which the next occurrence tries again', async () => {
    const job = app.get(OutageProbeJob);
    const before = job.runs;

    await app.get(JobRunner).runNow(OutageProbeJobName.Exclusive);

    expect(job.runs).toBe(before);
  });

  it('keeps a write behind the Valkey write gate and answers that the tenant is migrating', async () => {
    await expect(
      app.get(TenantWriteWaiter).awaitOpen(TENANT),
    ).rejects.toMatchObject({ code: ShardingErrorCode.TenantMigrating });
  });

  it('routes from the directory while Valkey is down and flushes the routing caches once it is back', async () => {
    const [first, second] = servers.shards();
    await servers
      .catalog()
      .query(
        `UPDATE shard_directory SET shard_group = ARRAY['${second.database}'], version = 2 WHERE tenant_id = '${TENANT}'`,
      );

    const during = await app.get(ShardRouter).resolve(read);
    outage.end();
    await PollUntil.run(
      async () =>
        (await ready()).summary.checks['valkey']?.state === HealthState.Up,
      RECOVERY_MS,
    );
    const after = await app.get(ShardRouter).resolve(read);

    expect(first.database).not.toBe(second.database);
    expect(during.logicalShard).toBe(second.database);
    expect(after.logicalShard).toBe(second.database);
  });
});
