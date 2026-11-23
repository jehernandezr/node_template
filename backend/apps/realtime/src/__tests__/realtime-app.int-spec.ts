import type { AddressInfo } from 'node:net';
import type { INestApplication } from '@nestjs/common';
import {
  ValkeyExecutors,
  ValkeyTestServer,
} from '@platform/adapters-valkey/test-utils';
import {
  ValkeyKeyspace,
  ValkeyRealtimeStream,
  ValkeySubscriberSource,
} from '@platform/adapters-valkey';
import { ContainerRuntime } from '@platform/kernel/test-utils';
import { Eventually } from '@platform/messaging/test-utils';
import { SseTestClient } from '@platform/realtime/test-utils';
import { IdentityStub } from '@platform/service/test-utils';
import { RealtimeApp } from '../realtime-app.js';

const USER = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9b01';
const TENANT = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9a01';
const STREAM = '/v1/notifications/stream';

new ContainerRuntime(process.env).describeIfAvailable('apps/realtime', () => {
  jest.setTimeout(120_000);
  const valkey = new ValkeyTestServer('notifications');
  const identity = new IdentityStub();
  let app: INestApplication;
  let notifications: ValkeyRealtimeStream;
  let subscribers: ValkeySubscriberSource;

  beforeAll(async () => {
    await valkey.start();
    await identity.start(valkey);
    app = await RealtimeApp.start(
      {
        ...valkey.environment(),
        ...identity.environment(),
        SERVICE_NAME: 'realtime',
        VALKEY_KEY_PREFIX: 'notifications',
        OTEL_SDK_DISABLED: 'true',
        PORT: '0',
      },
      '127.0.0.1',
    );
    subscribers = new ValkeySubscriberSource({
      create: async () => {
        const client = valkey.connect();
        await client.connect();
        return client;
      },
    });
    notifications = new ValkeyRealtimeStream(
      ValkeyExecutors.over(valkey.connect()),
      subscribers,
      new ValkeyKeyspace('notifications'),
      { retained: 100, ttlMs: 60_000 },
    );
  });

  afterAll(async () => {
    await app.close();
    await subscribers.close();
    await identity.stop();
    await valkey.stop();
  });

  const baseUrl = (): string =>
    `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}`;

  it('delivers over SSE what notifications writes into the stream of the user', async () => {
    const client = new SseTestClient();
    await client.open(`${baseUrl()}${STREAM}`, {
      Authorization: `Bearer ${await identity.tokenFor({ userId: USER, tenantId: TENANT })}`,
    });

    await notifications.append(USER, {
      type: 'notification',
      data: { title: 'Factura emitida' },
    });

    await Eventually.until(() => client.frames.length > 0, 10_000);
    expect(client.frames).toEqual([
      expect.objectContaining({
        type: 'notification',
        data: { title: 'Factura emitida' },
      }),
    ]);
    client.close();
  });

  it('answers the liveness probe', async () => {
    const response = await fetch(`${baseUrl()}/health/live`);

    expect(response.status).toBe(200);
  });
});
