import { Injectable } from '@nestjs/common';
import { NotificationChannel } from '@contracts/notifications';
import { Clock } from '@platform/kernel';
import { NotificationsDefaults } from '../../../shared/constants/notifications-defaults.constants.js';
import { EmailFacade, NotificationEmailKey } from '../../email/index.js';
import { PushFacade, PushOutcome } from '../../push/index.js';
import { DeliveryStatus, type Delivery } from '../domain/delivery.js';
import { DeliveryRetrySchedule } from '../domain/delivery-retry-schedule.js';
import type { Recipient } from '../domain/recipient.js';

/**
 * Delivers a notification by email or push and returns the delivery with its result. A failure stays in the
 * delivery so the job retries it with increasing backoff; after `maxDeliveryAttempts` it is abandoned. A push the
 * sender does not deliver is recorded as skipped.
 */
@Injectable()
export class ChannelDeliverer {
  constructor(
    private readonly email: EmailFacade,
    private readonly push: PushFacade,
    private readonly clock: Clock,
  ) {}

  /**
   * Sends one delivery through its channel and records the outcome on it.
   * @param delivery Delivery to send.
   * @param recipient User it goes to.
   * @returns The delivery with its new status.
   */
  async deliver(delivery: Delivery, recipient: Recipient): Promise<Delivery> {
    const attempts = delivery.attempts + 1;
    try {
      const sent = await this.send(delivery, recipient);
      return {
        ...delivery,
        attempts,
        status: sent.status,
        ...(sent.providerId === undefined
          ? {}
          : { providerId: sent.providerId }),
      };
    } catch (error) {
      return {
        ...delivery,
        attempts,
        status:
          attempts >= NotificationsDefaults.maxDeliveryAttempts
            ? DeliveryStatus.Abandoned
            : DeliveryStatus.Failed,
        nextAttemptAt: DeliveryRetrySchedule.afterFailure(
          attempts,
          this.clock.now(),
        ),
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /** The status and, for email, the provider's id; a push goes out to several devices and does not have a single one. */
  private async send(
    delivery: Delivery,
    recipient: Recipient,
  ): Promise<{ status: DeliveryStatus; providerId?: string }> {
    if (delivery.channel === NotificationChannel.Email) {
      const providerId = await this.email.send({
        messageId: delivery.id,
        template: NotificationEmailKey.Notification,
        to: recipient.email,
        locale: delivery.locale,
        parameters: new Map([
          ['title', delivery.title],
          ['body', delivery.body],
        ]),
      });
      return { status: DeliveryStatus.Sent, providerId };
    }
    const outcome = await this.push.deliver(recipient.ref, {
      notificationId: delivery.notificationId,
      title: delivery.title,
      body: delivery.body,
    });
    return {
      status:
        outcome === PushOutcome.Skipped
          ? DeliveryStatus.Skipped
          : DeliveryStatus.Sent,
    };
  }
}
