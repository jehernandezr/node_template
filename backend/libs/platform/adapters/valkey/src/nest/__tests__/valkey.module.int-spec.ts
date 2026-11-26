import { KernelModule } from '@platform/kernel/nest';
import { Test, type TestingModule } from '@nestjs/testing';
import { ContainerRuntime } from '@platform/kernel/test-utils';
import { HealthState } from '@platform/kernel';
import { HealthRegistry } from '@platform/observability';
import type { Valkey } from 'iovalkey';
import { ValkeyCache } from '../../valkey-cache.js';
import { ValkeyJobLock } from '../../valkey-job-lock.js';
import {
  PollUntil,
  RecordingLogger,
  ValkeyTestServer,
} from '../../__tests__/utils/index.js';
import { ValkeyModule } from '../valkey.module.js';
import { VALKEY_CLIENT } from '../valkey.tokens.js';
import { ValkeyTestPlatformModule } from './utils/valkey-test-platform.module.js';

jest.setTimeout(60_000);

const runtime = new ContainerRuntime(process.env);

runtime.describeIfAvailable('ValkeyModule against a real server', () => {
  const server = new ValkeyTestServer('orders');
  let apps: TestingModule[];

  beforeAll(() => server.start(), 300_000);
  afterAll(() => server.stop());

  beforeEach(async () => {
    apps = [];
    await server.flush();
  });

  afterEach(async () => {
    for (const app of apps) {
      await app.close();
    }
  });

  async function instance(): Promise<TestingModule> {
    const app = await Test.createTestingModule({
      imports: [
        KernelModule,
        ValkeyTestPlatformModule.with(
          new RecordingLogger(),
          server.environment(),
        ),
        ValkeyModule.forRoot({ commandTimeoutMs: 5_000 }),
      ],
    }).compile();
    apps.push(app);
    await app.init();
    return app;
  }

  it('stores under the service name and reports the server as healthy', async () => {
    const app = await instance();

    await app.get(ValkeyCache).set('greeting', 'hello');

    await expect(server.keys('*')).resolves.toEqual(['orders:greeting']);
    const summary = await app.get(HealthRegistry).checkAll();
    expect(summary.checks['valkey']).toEqual({ state: HealthState.Up });
  });

  it('keeps two instances from taking the same job', async () => {
    const [first, second] = [await instance(), await instance()];

    const lease = await first.get(ValkeyJobLock).tryAcquire('relay', 10_000);

    expect(lease).toBeDefined();
    await expect(
      second.get(ValkeyJobLock).tryAcquire('relay', 10_000),
    ).resolves.toBeUndefined();
  });

  it('quits its connection when the application closes', async () => {
    const app = await instance();
    const client = app.get<Valkey>(VALKEY_CLIENT, { strict: false });
    await app.get(ValkeyCache).set('k', 'v');
    expect(client.status).toBe('ready');

    await app.close();
    apps.splice(apps.indexOf(app), 1);

    await PollUntil.run(() => client.status === 'end');
  });
});
