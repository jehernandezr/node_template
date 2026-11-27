import { PlatformErrorCode } from '@contracts/platform';
import {
  NotificationType,
  NotifyUserOperation,
  TemplateParameter,
} from '@contracts/notifications';
import { PollUntil, ValkeyOutage } from '@platform/adapters-valkey/test-utils';
import { HealthState } from '@platform/kernel';
import { ContainerRuntime } from '@platform/kernel/test-utils';
import { CallOutcomeKind } from '@platform/primitives';
import { NotificationsTestApp } from './utils/index.js';

const STREAM = '/v1/notifications/stream';
const CARLA = {
  userId: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9b21',
  tenantId: NotificationsTestApp.TENANT_A,
  email: 'carla.outage@example.com',
};
const DIEGO = {
  userId: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9b22',
  tenantId: NotificationsTestApp.TENANT_B,
  email: 'diego.outage@example.com',
};
const BREAKER_FAILURES = 5;

interface ReadySummary {
  readonly checks: Readonly<Record<string, { readonly state: HealthState }>>;
}

new ContainerRuntime(process.env).describeIfAvailable(
  'notifications while Valkey is down',
  () => {
    jest.setTimeout(300_000);
    const app = new NotificationsTestApp();
    const outage = new ValkeyOutage(() => ({
      host: app.servers.valkey.host,
      port: app.servers.valkey.port,
    }));
    let carlaToken: string;
    let diegoToken: string;

    const ready = async () => {
      const response = await app.anonymous().get('/health/ready');
      return {
        status: response.status,
        summary: response.body as ReadySummary,
      };
    };

    beforeAll(async () => {
      await outage.start();
      await app.start(outage.environment());
      carlaToken = await app.tokenOf(CARLA);
      diegoToken = await app.tokenOf(DIEGO);
      outage.begin();
      for (let attempt = 0; attempt < BREAKER_FAILURES; attempt += 1) {
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

    it('refuses an authenticated request with a retryable 503 instead of skipping the revocation check', async () => {
      const response = await app
        .anonymous()
        .withHeaders({ Authorization: `Bearer ${carlaToken}` })
        .get('/v1/notifications/unread-count');

      expect(response.status).toBe(503);
      expect(response.body).toMatchObject({
        code: PlatformErrorCode.DependencyUnavailable,
      });
    });

    it('refuses the real-time stream with 503, never 401, so the client keeps its session', async () => {
      const response = await fetch(`${app.baseUrl()}${STREAM}`, {
        headers: { Authorization: `Bearer ${diegoToken}` },
      });

      expect(response.status).toBe(503);
      expect(response.headers.get('retry-after')).toEqual(expect.any(String));
      await expect(response.json()).resolves.toMatchObject({
        code: PlatformErrorCode.DependencyUnavailable,
      });
    });

    it('stores a notification in the inbox and mails it without live frames', async () => {
      const outcome = await app.internal().invoke(NotifyUserOperation, {
        notificationId: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9d71',
        user: { userId: DIEGO.userId, homeTenantId: DIEGO.tenantId },
        tenantId: DIEGO.tenantId,
        type: NotificationType.InvoiceIssued,
        parameters: [{ name: TemplateParameter.Reference, value: 'F-0900' }],
      });

      expect(outcome).toMatchObject({ kind: CallOutcomeKind.Success });
      await expect(
        app.servers
          .shards()[1]
          .rows(
            `SELECT 1 FROM notifications WHERE user_id = '${DIEGO.userId}'`,
          ),
      ).resolves.toHaveLength(1);
      await app.mailpit.waitForMailTo(DIEGO.email, 10_000);
    });

    it('serves the inbox again once Valkey is back', async () => {
      outage.end();
      await PollUntil.run(
        async () =>
          (await ready()).summary.checks['valkey']?.state === HealthState.Up,
        30_000,
      );

      const inbox = await app
        .anonymous()
        .withHeaders({ Authorization: `Bearer ${diegoToken}` })
        .get('/v1/notifications/unread-count');

      expect(inbox.body).toEqual({ count: 1 });
    });
  },
);
