import { ContainerRuntime } from '@platform/kernel/test-utils';
import {
  ServiceDefinitionBuilder,
  ServiceTestApp,
  ServiceTestServers,
} from '../../../__tests__/utils/index.js';
import { HealthRoute } from '../../health/health-route.enum.js';
import {
  RuntimeProbeRootModule,
  runtimeProbeContract,
} from '../../runtime/__tests__/utils/index.js';
import { HttpApplicationConfigurer } from '../http-application-configurer.js';

jest.setTimeout(240_000);

const runtime = new ContainerRuntime(process.env);

/** Leaves the HTTP application as Nest creates it: the probe service has no HTTP contract. */
class PlainHttpSetup extends HttpApplicationConfigurer {
  configure(): Promise<void> {
    return Promise.resolve();
  }
}
const TENANT_A = '0193f1c2-0000-7000-8000-0000000000a1';
const TENANT_B = '0193f1c2-0000-7000-8000-0000000000b2';

runtime.describeIfAvailable('ServiceTestApp over PostgreSQL and Valkey', () => {
  const servers = new ServiceTestServers(runtimeProbeContract.service);
  const app = new ServiceTestApp({
    definition: ServiceDefinitionBuilder.aDefinition(
      runtimeProbeContract.service,
    )
      .with({
        contract: runtimeProbeContract,
        rootModule: RuntimeProbeRootModule,
      })
      .build(),
    servers,
    configurer: new PlainHttpSetup(),
    tenants: { [TENANT_A]: 0, [TENANT_B]: 1 },
    environment: () => ({ SERVICE_VERSION: 'probe-1' }),
  });

  beforeAll(() => app.start());

  afterAll(() => app.stop());

  it('serves HTTP on a free port of the loopback interface', async () => {
    const response = await app
      .client()
      .get(`/${HealthRoute.Base}/${HealthRoute.Live}`);

    expect(app.baseUrl()).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);
    expect(response.status).toBe(200);
  });

  it('starts with the test defaults, the databases and the service variables', () => {
    expect(app.environment()).toMatchObject({
      NODE_ENV: 'test',
      SERVICE_VERSION: 'probe-1',
      DB_USER: servers.serviceRole,
    });
    expect(app.environment()['INTERNAL_API_SHARED_SECRET']).toEqual(
      expect.any(String),
    );
  });

  it('places each tenant in its shard of the directory', async () => {
    const rows = await servers
      .catalog()
      .rows<{ tenant_id: string; shard_group: string[] }>(
        'SELECT tenant_id, shard_group FROM shard_directory ORDER BY tenant_id',
      );

    expect(rows).toEqual([
      { tenant_id: TENANT_A, shard_group: [servers.shards()[0].database] },
      { tenant_id: TENANT_B, shard_group: [servers.shards()[1].database] },
    ]);
    expect(app.shardOf(TENANT_B)).toBe(servers.shards()[1]);
  });
});
