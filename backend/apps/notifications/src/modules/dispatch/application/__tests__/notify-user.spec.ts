import {
  NotificationChannel,
  NotificationsEvent,
  NotificationType,
} from '@contracts/notifications';
import { DeliveryStatus } from '../../domain/delivery.js';
import { DeliveryRetrySchedule } from '../../domain/delivery-retry-schedule.js';
import { DispatchHarness } from '../../__tests__/utils/index.js';

const ONE_DAY_MS = 24 * 60 * 60_000;

const emailDelivery = (harness: DispatchHarness) =>
  harness.deliveries
    .all()
    .find((delivery) => delivery.channel === NotificationChannel.Email);

describe('NotifyUser', () => {
  describe('for a user without preferences', () => {
    it('stores the notification, announces it in real time and sends it by email and push', async () => {
      const harness = new DispatchHarness();

      const channels = await harness.notifyUser.notify(harness.command());

      expect(channels).toEqual([
        NotificationChannel.InApp,
        NotificationChannel.Push,
        NotificationChannel.Email,
      ]);
      expect([...harness.inbox.stored.values()]).toEqual([
        expect.objectContaining({
          title: 'Factura emitida',
          body: 'Se emitió la factura F-0042.',
        }),
      ]);
      expect(harness.realtime.frames.map((frame) => frame.kind)).toEqual([
        'notification',
        'unread-count',
      ]);
      expect(harness.email.sent).toEqual([
        expect.objectContaining({ to: 'ana@example.com', locale: 'es' }),
      ]);
      expect(harness.push.sent).toHaveLength(1);
      expect(harness.deliveries.all().map((d) => d.status)).toEqual([
        DeliveryStatus.Sent,
        DeliveryStatus.Sent,
        DeliveryStatus.Sent,
      ]);
      expect(harness.bus.messages).toEqual([
        expect.objectContaining({
          type: NotificationsEvent.NotificationCreated,
          tenantId: DispatchHarness.TENANT,
        }),
      ]);
    });
  });

  it('skips push for a user who is connected in real time', async () => {
    const harness = new DispatchHarness();
    harness.realtime.online = true;

    const channels = await harness.notifyUser.notify(harness.command());

    expect(channels).not.toContain(NotificationChannel.Push);
    expect(harness.push.sent).toEqual([]);
  });

  it('keeps a security alert on every channel during quiet hours', async () => {
    const harness = new DispatchHarness();
    harness.preferences.set(DispatchHarness.ANA.userId, {
      enabled: [{ type: NotificationType.SecurityAlert, channels: [] }],
      quietStart: '00:00',
      quietEnd: '23:59',
      timezone: 'UTC',
    });

    const channels = await harness.notifyUser.notify(
      harness.command({ type: NotificationType.SecurityAlert }),
    );

    expect(channels).toEqual(Object.values(NotificationChannel));
  });

  it('delivers the same notification only once when it is repeated', async () => {
    const harness = new DispatchHarness();
    const first = await harness.notifyUser.notify(harness.command());

    const again = await harness.notifyUser.notify(harness.command());

    expect(again).toEqual(first);
    expect(harness.email.sent).toHaveLength(1);
    expect(harness.bus.messages).toHaveLength(1);
  });

  it('notifies nobody when identity no longer knows the user', async () => {
    const harness = new DispatchHarness();

    const channels = await harness.notifyUser.notify(
      harness.command({
        user: {
          userId: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9b99',
          homeTenantId: DispatchHarness.TENANT,
        },
      }),
    );

    expect(channels).toEqual([]);
    expect(harness.inbox.stored.size).toBe(0);
  });

  describe('when the email provider fails', () => {
    it('leaves the delivery failed and the retry job sends it once its wait is over', async () => {
      const harness = new DispatchHarness();
      harness.email.failures = 1;
      await harness.notifyUser.notify(harness.command());
      const failed = emailDelivery(harness);

      await harness.retry.run();
      const sentBeforeWait = harness.email.sent.length;
      harness.clock.advance(2 * DeliveryRetrySchedule.FIRST_RETRY_MS);
      await harness.retry.run();

      expect(failed).toMatchObject({
        status: DeliveryStatus.Failed,
        attempts: 1,
      });
      expect(sentBeforeWait).toBe(0);
      expect(emailDelivery(harness)).toMatchObject({
        status: DeliveryStatus.Sent,
        attempts: 2,
      });
      expect(harness.email.sent).toEqual([
        expect.objectContaining({ messageId: failed?.id }),
      ]);
    });

    it('waits twice as long after each failed retry', async () => {
      const harness = new DispatchHarness();
      harness.email.failures = 2;
      await harness.notifyUser.notify(harness.command());
      harness.clock.advance(2 * DeliveryRetrySchedule.FIRST_RETRY_MS);
      await harness.retry.run();

      harness.clock.advance(2 * DeliveryRetrySchedule.FIRST_RETRY_MS);
      await harness.retry.run();
      const afterShortWait = emailDelivery(harness)?.status;
      harness.clock.advance(2 * DeliveryRetrySchedule.FIRST_RETRY_MS);
      await harness.retry.run();

      expect(afterShortWait).toBe(DeliveryStatus.Failed);
      expect(emailDelivery(harness)).toMatchObject({
        status: DeliveryStatus.Sent,
        attempts: 3,
      });
    });

    it('abandons the delivery after the last attempt', async () => {
      const harness = new DispatchHarness();
      harness.email.failures = 5;
      await harness.notifyUser.notify(harness.command());

      for (let run = 0; run < 5; run += 1) {
        harness.clock.advance(ONE_DAY_MS);
        await harness.retry.run();
      }

      expect(emailDelivery(harness)).toMatchObject({
        status: DeliveryStatus.Abandoned,
        attempts: 5,
      });
      expect(harness.email.sent).toEqual([]);
    });
  });

  describe('when the process stopped before sending', () => {
    it('leaves a delivery just stored as pending to its own send and retries it after the margin', async () => {
      const harness = new DispatchHarness();
      await harness.deliveries.save({
        id: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9c71',
        notificationId: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9d71',
        userId: DispatchHarness.ANA.userId,
        homeTenantId: DispatchHarness.ANA.homeTenantId,
        channel: NotificationChannel.Email,
        status: DeliveryStatus.Pending,
        attempts: 0,
        nextAttemptAt: DeliveryRetrySchedule.firstRetryAt(harness.clock.now()),
        title: 'Factura emitida',
        body: 'Se emitió la factura F-0042.',
        locale: 'es',
      });

      await harness.retry.run();
      const sentRightAway = harness.email.sent.length;
      harness.clock.advance(DeliveryRetrySchedule.FIRST_RETRY_MS);
      await harness.retry.run();

      expect(sentRightAway).toBe(0);
      expect(harness.email.sent).toEqual([
        expect.objectContaining({ to: 'ana@example.com' }),
      ]);
    });
  });
});
