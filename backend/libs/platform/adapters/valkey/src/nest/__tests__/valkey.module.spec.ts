import { KernelModule } from '@platform/kernel/nest';
import type { DynamicModule } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { BloomFilterFactory } from '@platform/bloom';
import { ConfigValidationError } from '@platform/config';
import { HealthRegistry } from '@platform/observability';
import { HealthState, JobLock } from '@platform/kernel';
import type { Valkey } from 'iovalkey';
import { ValkeyAuthRevocationFeed } from '../../auth/valkey-auth-revocation-feed.js';
import { ValkeyAuthStateReader } from '../../auth/valkey-auth-state-reader.js';
import { ValkeyAuthStateWriter } from '../../auth/valkey-auth-state-writer.js';
import { ValkeyAuthMode } from '../../valkey-auth-mode.enum.js';
import { ValkeyBloomFilterFactory } from '../../valkey-bloom-filter-factory.js';
import { ValkeyCache } from '../../valkey-cache.js';
import { ValkeyCommandExecutor } from '../../valkey-command-executor.js';
import { ValkeyErrorCode } from '../../valkey-error-code.enum.js';
import { ValkeyErrorTranslator } from '../../valkey-error-translator.js';
import { ValkeyHealthIndicator } from '../../valkey-health-indicator.js';
import { ValkeyJobLock } from '../../valkey-job-lock.js';
import { ValkeyKeyspace } from '../../valkey-keyspace.js';
import { ValkeyRateLimiter } from '../../valkey-rate-limiter.js';
import { ValkeyRoutingCache } from '../../valkey-routing-cache.js';
import { ValkeyShardDirectoryChannel } from '../../valkey-shard-directory-channel.js';
import { ValkeySubscriberSource } from '../../valkey-subscriber-source.js';
import {
  FakePubSubBroker,
  FakeValkeyClient,
  PollUntil,
  RecordingLogger,
  StaticTokenProvider,
} from '../../__tests__/utils/index.js';
import { ValkeyModule } from '../valkey.module.js';
import { VALKEY_CLIENT } from '../valkey.tokens.js';
import { ValkeyTestPlatformModule } from './utils/valkey-test-platform.module.js';

describe('ValkeyModule', () => {
  let logger: RecordingLogger;
  let client: FakeValkeyClient;
  let apps: TestingModule[];

  beforeEach(() => {
    logger = new RecordingLogger();
    client = new FakeValkeyClient();
    apps = [];
  });

  afterEach(async () => {
    for (const app of apps) {
      await app.close();
    }
  });

  /** Application with a fake client instead of the real connection. */
  async function appWith(
    valkey: DynamicModule,
    env?: Record<string, string>,
    overrides: { subscribers?: ValkeySubscriberSource } = {},
  ): Promise<TestingModule> {
    const builder = Test.createTestingModule({
      imports: [
        KernelModule,
        ValkeyTestPlatformModule.with(logger, env),
        valkey,
      ],
    })
      .overrideProvider(VALKEY_CLIENT)
      .useValue(client);
    if (overrides.subscribers !== undefined) {
      builder
        .overrideProvider(ValkeySubscriberSource)
        .useValue(overrides.subscribers);
    }
    const app = await builder.compile();
    apps.push(app);
    await app.init();
    return app;
  }

  async function close(app: TestingModule): Promise<void> {
    await app.close();
    apps.splice(apps.indexOf(app), 1);
  }

  it('provides the auth state reader, writer and revocation feed', async () => {
    const app = await appWith(ValkeyModule.forRoot());

    expect(app.get(ValkeyAuthStateReader)).toBeInstanceOf(
      ValkeyAuthStateReader,
    );
    expect(app.get(ValkeyAuthStateWriter)).toBeInstanceOf(
      ValkeyAuthStateWriter,
    );
    expect(app.get(ValkeyAuthRevocationFeed)).toBeInstanceOf(
      ValkeyAuthRevocationFeed,
    );
  });

  it('registers its health indicator, which pings the client', async () => {
    const app = await appWith(ValkeyModule.forRoot());

    const summary = await app.get(HealthRegistry).checkAll();

    expect(summary.state).toBe(HealthState.Up);
    expect(summary.checks['valkey']).toEqual({ state: HealthState.Up });
    expect(client.commands).toEqual(['PING']);
  });

  it('quits the client when the application closes', async () => {
    const app = await appWith(ValkeyModule.forRoot());

    await close(app);

    expect(client.quits).toBe(1);
    expect(client.disconnects).toBe(0);
  });

  it('cuts the client when quit fails', async () => {
    const app = await appWith(ValkeyModule.forRoot());
    client.quitFails = true;

    await close(app);

    expect(client.disconnects).toBe(1);
  });

  it('closes the subscriber connection before the command client', async () => {
    const closes: string[] = [];
    client = new FakeValkeyClient(closes);
    const broker = new FakePubSubBroker(closes);
    const subscribers = new ValkeySubscriberSource(broker.opener);
    const app = await appWith(ValkeyModule.forRoot(), undefined, {
      subscribers,
    });
    await subscribers.connection();

    await close(app);

    expect(closes).toEqual(['subscriber quit', 'client quit']);
  });

  it('uses SERVICE_NAME as the key prefix by default', async () => {
    const app = await appWith(ValkeyModule.forRoot());

    expect(app.get(ValkeyKeyspace).prefix).toBe('orders');
    await app.get(ValkeyCache).set('a', 'v');
    expect(client.commands).toEqual(['SET']);
  });

  it('prefers VALKEY_KEY_PREFIX over the service name', async () => {
    const app = await appWith(ValkeyModule.forRoot(), {
      ...ValkeyTestPlatformModule.ENV,
      VALKEY_KEY_PREFIX: 'identity',
    });

    expect(app.get(ValkeyKeyspace).prefix).toBe('identity');
  });

  it('exports every adapter by class, so the core modules receive them as types', async () => {
    const app = await appWith(ValkeyModule.forRoot());
    const get = <T>(type: abstract new (...args: never[]) => T): T =>
      app.get(type, { strict: false });

    expect(get(ValkeyCache)).toBeInstanceOf(ValkeyCache);
    expect(get(ValkeyRateLimiter)).toBeInstanceOf(ValkeyRateLimiter);
    expect(get(ValkeyRoutingCache)).toBeInstanceOf(ValkeyRoutingCache);
    expect(get(ValkeyShardDirectoryChannel)).toBeInstanceOf(
      ValkeyShardDirectoryChannel,
    );
    expect(get(ValkeyBloomFilterFactory)).toBeInstanceOf(BloomFilterFactory);
    expect(get(ValkeyJobLock)).toBeInstanceOf(JobLock);
    expect(get(ValkeyHealthIndicator).name).toBe('valkey');
    expect(get(ValkeyCommandExecutor)).toBeInstanceOf(ValkeyCommandExecutor);
    expect(get(ValkeyErrorTranslator)).toBeInstanceOf(ValkeyErrorTranslator);
  });

  it('reports a change that cannot be delivered through the logger, without its detail', async () => {
    const broker = new FakePubSubBroker();
    const subscribers = new ValkeySubscriberSource(broker.opener);
    const app = await appWith(ValkeyModule.forRoot(), undefined, {
      subscribers,
    });
    await app.get(ValkeyShardDirectoryChannel).subscribe(async () => undefined);

    broker.emit('orders:sharding:directory-changed', '{bad');

    await PollUntil.run(() => logger.errors.length === 1);
    expect(logger.errors[0]).toEqual({
      message: 'shard directory change not delivered',
      fields: {
        error: {
          name: 'ValkeyUnexpectedReplyError',
          code: ValkeyErrorCode.UnexpectedReply,
          message: expect.any(String),
        },
      },
    });
  });

  describe('against a client that has not connected', () => {
    async function realApp(
      module: DynamicModule,
      env?: Record<string, string>,
    ) {
      const app = await Test.createTestingModule({
        imports: [
          KernelModule,
          ValkeyTestPlatformModule.with(logger, env),
          module,
        ],
      }).compile();
      apps.push(app);
      await app.init();
      return app;
    }

    it('applies the runtime options and closes without waiting for a server', async () => {
      const app = await realApp(
        ValkeyModule.forRoot({ connectionName: 'orders-api' }),
      );
      const valkey = app.get<Valkey>(VALKEY_CLIENT, { strict: false });
      expect(valkey.options.connectionName).toBe('orders-api');
      expect(valkey.status).toBe('wait');

      await close(app);

      expect(valkey.status).toBe('end');
    });

    it('takes the runtime options from forRootAsync', async () => {
      const app = await realApp(
        ValkeyModule.forRootAsync({
          useFactory: () => ({ connectionName: 'from-factory' }),
        }),
      );
      expect(
        app.get<Valkey>(VALKEY_CLIENT, { strict: false }).options
          .connectionName,
      ).toBe('from-factory');
    });

    it('authenticates with the token provider the application names', async () => {
      const app = await realApp(
        ValkeyModule.forRoot({ authToken: StaticTokenProvider }),
        {
          SERVICE_NAME: 'orders',
          VALKEY_HOST: '127.0.0.1',
          VALKEY_PORT: '1',
          VALKEY_TLS: 'true',
          VALKEY_USER: 'svc',
          VALKEY_AUTH: ValkeyAuthMode.IamServerless,
          VALKEY_CACHE_NAME: 'cache-1',
        },
      );
      expect(
        app.get<Valkey>(VALKEY_CLIENT, { strict: false }).options.password,
      ).toBe(StaticTokenProvider.TOKEN);
    });

    it('does not start when an IAM mode has no token provider, listing the variables', async () => {
      const failure = await realApp(ValkeyModule.forRoot(), {
        SERVICE_NAME: 'orders',
        VALKEY_HOST: '127.0.0.1',
        VALKEY_AUTH: ValkeyAuthMode.Iam,
      }).catch((error: unknown) => error);
      expect(failure).toBeInstanceOf(ConfigValidationError);
    });

    it('does not start with a service name that cannot be a key prefix', async () => {
      const failure = await realApp(ValkeyModule.forRoot(), {
        SERVICE_NAME: 'orders api',
        VALKEY_URL: 'redis://127.0.0.1:1',
      }).catch((error: unknown) => error);
      expect(failure).toBeInstanceOf(ConfigValidationError);
    });
  });
});
