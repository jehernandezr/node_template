import {
  EmailTemplate,
  EraseNotificationsUserDataOperation,
  SendEmailOperation,
  NotificationChannel,
  NotificationFrameType,
  NotificationsErrorCode,
  NotificationType,
  NotifyUserOperation,
  TemplateParameter,
} from '@contracts/notifications';
import { ContainerRuntime } from '@platform/kernel/test-utils';
import { Eventually } from '@platform/messaging/test-utils';
import { CallOutcomeKind } from '@platform/primitives';
import { SseTestClient } from '@platform/realtime/test-utils';
import { RetryDeliveriesJob } from '../modules/dispatch/application/retry-deliveries.job.js';
import { PurgeReadNotificationsJob } from '../modules/inbox/application/purge-read-notifications.job.js';
import { NotificationsTestApp } from './utils/index.js';

const ANA = {
  userId: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9b01',
  tenantId: NotificationsTestApp.TENANT_A,
  email: 'ana@example.com',
};
const BEA = {
  userId: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9b02',
  tenantId: NotificationsTestApp.TENANT_B,
  email: 'bea@example.com',
  locale: 'en',
};
const STREAM = '/v1/notifications/stream';

new ContainerRuntime(process.env).describeIfAvailable(
  'notifications on two shards',
  () => {
    jest.setTimeout(300_000);
    const app = new NotificationsTestApp();
    let notificationSeq = 0;

    beforeAll(async () => {
      await app.start();
    });

    afterAll(async () => {
      await app.stop();
    });

    const notify = (
      member: { userId: string; tenantId: string },
      reference: string,
    ) => {
      notificationSeq += 1;
      return app.internal().invoke(NotifyUserOperation, {
        notificationId: `0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9d${String(notificationSeq).padStart(2, '0')}`,
        user: { userId: member.userId, homeTenantId: member.tenantId },
        tenantId: member.tenantId,
        type: NotificationType.InvoiceIssued,
        parameters: [{ name: TemplateParameter.Reference, value: reference }],
      });
    };

    const rowsIn = (shard: 0 | 1, sql: string) =>
      app.servers.shards()[shard].rows(sql);

    it('keeps preferences in the home shard of each user and rejects quiet hours without a valid zone', async () => {
      const ana = await app.clientOf(ANA);
      const bea = await app.clientOf(BEA);
      const preferences = {
        enabled: [
          {
            type: NotificationType.TaskUpdated,
            channels: [NotificationChannel.Email],
          },
        ],
        quietStart: '22:00',
        quietEnd: '07:00',
        timezone: 'America/Bogota',
      };

      expect(
        (await ana.put('/v1/notification-preferences', { body: preferences }))
          .status,
      ).toBe(204);
      const invalid = await bea.put('/v1/notification-preferences', {
        body: { ...preferences, timezone: 'Mars/Olympus' },
      });

      expect((await ana.get('/v1/notification-preferences')).body).toEqual(
        preferences,
      );
      expect(invalid.status).toBe(400);
      expect(invalid.body).toMatchObject({
        code: NotificationsErrorCode.PreferencesInvalidQuietHours,
      });
      await expect(
        rowsIn(
          0,
          `SELECT 1 FROM notification_preferences WHERE user_id = '${ANA.userId}'`,
        ),
      ).resolves.toHaveLength(1);
      await expect(
        rowsIn(
          1,
          `SELECT 1 FROM notification_preferences WHERE user_id = '${ANA.userId}'`,
        ),
      ).resolves.toHaveLength(0);
    });

    it('stores a notification in the inbox of its user, mails it and lets the user read it', async () => {
      const bea = await app.clientOf(BEA);

      const outcome = await notify(BEA, 'F-0042');
      const inbox = await bea.get('/v1/notifications');
      const [notification] = (
        inbox.body as { items: Array<{ id: string; title: string }> }
      ).items;
      const unreadBefore = await bea.get('/v1/notifications/unread-count');
      await bea.post(`/v1/notifications/${String(notification?.id)}/read`);
      const unreadAfter = await bea.get('/v1/notifications/unread-count');

      expect(outcome).toMatchObject({ kind: CallOutcomeKind.Success });
      expect(notification?.title).toBe('Invoice issued');
      expect(unreadBefore.body).toEqual({ count: 1 });
      expect(unreadAfter.body).toEqual({ count: 0 });
      await expect(
        rowsIn(
          1,
          `SELECT 1 FROM notifications WHERE user_id = '${BEA.userId}'`,
        ),
      ).resolves.toHaveLength(1);
      await app.mailpit.waitForMailTo(BEA.email, 10_000);
      await expect(app.mailpit.received()).resolves.toContainEqual(
        expect.objectContaining({
          from: NotificationsTestApp.FROM,
          to: BEA.email,
          subject: 'Invoice issued',
          text: expect.stringContaining('Invoice F-0042 was issued.'),
        }),
      );
    });

    it('streams new notifications over SSE and resumes after a cut without losing any', async () => {
      const token = await app.tokenOf(ANA);
      const first = new SseTestClient();
      await first.open(`${app.baseUrl()}${STREAM}`, {
        Authorization: `Bearer ${token}`,
      });
      await notify(ANA, 'F-0100');
      await Eventually.until(
        () =>
          first.frames.some(
            (frame) => frame.type === NotificationFrameType.Notification,
          ),
        10_000,
      );
      const lastSeen = first.lastEventId();
      first.close();

      await notify(ANA, 'F-0101');
      const resumed = new SseTestClient();
      await resumed.open(`${app.baseUrl()}${STREAM}`, {
        Authorization: `Bearer ${token}`,
        'Last-Event-ID': String(lastSeen),
      });
      await Eventually.until(
        () =>
          resumed.frames.some(
            (frame) => frame.type === NotificationFrameType.Notification,
          ),
        10_000,
      );
      resumed.close();

      expect(
        resumed.frames.filter(
          (frame) => frame.type === NotificationFrameType.Notification,
        ),
      ).toEqual([
        expect.objectContaining({
          data: expect.objectContaining({
            body: expect.stringContaining('F-0101'),
          }),
        }),
      ]);
    });

    it('sends a transactional email asked by another service once per message id', async () => {
      const input = {
        messageId: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9e51',
        template: EmailTemplate.MfaCode,
        to: 'codigo@example.com',
        locale: 'es',
        parameters: [{ name: TemplateParameter.Code, value: '482913' }],
      };

      const first = await app.internal().invoke(SendEmailOperation, input);
      const again = await app.internal().invoke(SendEmailOperation, input);
      await app.mailpit.waitForMailTo('codigo@example.com', 10_000);

      expect([first, again]).toEqual([
        {
          kind: CallOutcomeKind.Success,
          value: { messageId: input.messageId },
        },
        {
          kind: CallOutcomeKind.Success,
          value: { messageId: input.messageId },
        },
      ]);
      expect(
        (await app.mailpit.received()).filter(
          (mail) => mail.to === 'codigo@example.com',
        ),
      ).toEqual([
        expect.objectContaining({ text: expect.stringContaining('482913') }),
      ]);
    });

    it('retries in every shard the deliveries the provider refused, mails them, and purges old read notifications', async () => {
      const carl = {
        userId: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9b03',
        tenantId: NotificationsTestApp.TENANT_A,
        email: 'carl@example.com',
      };
      const dana = {
        userId: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9b04',
        tenantId: NotificationsTestApp.TENANT_B,
        email: 'dana@example.com',
      };
      const waitOver = (shard: 0 | 1, userId: string) =>
        app.servers
          .shards()
          [shard].query(
            `UPDATE notification_deliveries SET next_attempt_at = now() - interval '1 minute' WHERE user_id = '${userId}' AND channel = 'email'`,
          );
      const emailStatus = (shard: 0 | 1, userId: string) =>
        rowsIn(
          shard,
          `SELECT status FROM notification_deliveries WHERE user_id = '${userId}' AND channel = 'email'`,
        );
      const mailedTo = async (address: string) =>
        (await app.mailpit.received()).filter((mail) => mail.to === address);
      const client = await app.clientOf(carl);
      await app.clientOf(dana);
      await app.mailpit.rejectRecipients();
      try {
        await notify(carl, 'F-0300');
        await notify(dana, 'F-0301');
      } finally {
        await app.mailpit.acceptRecipients();
      }
      await expect(emailStatus(0, carl.userId)).resolves.toEqual([
        { status: 'failed' },
      ]);
      await expect(emailStatus(1, dana.userId)).resolves.toEqual([
        { status: 'failed' },
      ]);
      await expect(mailedTo(carl.email)).resolves.toEqual([]);
      await waitOver(0, carl.userId);
      await waitOver(1, dana.userId);
      await client.post('/v1/notifications/read-all');
      await app.servers
        .shards()[0]
        .query(
          `UPDATE notifications SET read_at = now() - interval '400 days' WHERE user_id = '${carl.userId}'`,
        );

      await app.get(RetryDeliveriesJob).run();
      await app.get(PurgeReadNotificationsJob).run();

      await expect(emailStatus(0, carl.userId)).resolves.toEqual([
        { status: 'sent' },
      ]);
      await expect(emailStatus(1, dana.userId)).resolves.toEqual([
        { status: 'sent' },
      ]);
      await app.mailpit.waitForMailTo(carl.email, 10_000);
      await app.mailpit.waitForMailTo(dana.email, 10_000);
      await expect(mailedTo(carl.email)).resolves.toHaveLength(1);
      await expect(mailedTo(dana.email)).resolves.toHaveLength(1);
      await expect(
        rowsIn(
          0,
          `SELECT 1 FROM notifications WHERE user_id = '${carl.userId}'`,
        ),
      ).resolves.toEqual([]);
      expect((await client.get('/v1/notifications/unread-count')).body).toEqual(
        { count: 0 },
      );
    });

    it('erases every notification row of a user and repeats without error', async () => {
      await notify(ANA, 'F-0200');

      const first = await app
        .internal()
        .invoke(EraseNotificationsUserDataOperation, {
          user: { userId: ANA.userId, homeTenantId: ANA.tenantId },
        });
      const again = await app
        .internal()
        .invoke(EraseNotificationsUserDataOperation, {
          user: { userId: ANA.userId, homeTenantId: ANA.tenantId },
        });

      expect(first).toMatchObject({ kind: CallOutcomeKind.Success });
      expect(again).toMatchObject({ value: { affectedRows: 0 } });
      await expect(
        rowsIn(
          0,
          `SELECT 1 FROM notifications WHERE user_id = '${ANA.userId}'`,
        ),
      ).resolves.toEqual([]);
      await expect(
        rowsIn(
          0,
          `SELECT 1 FROM notification_deliveries WHERE user_id = '${ANA.userId}'`,
        ),
      ).resolves.toEqual([]);
    });
  },
);
