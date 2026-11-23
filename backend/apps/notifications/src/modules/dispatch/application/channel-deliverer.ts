import { Injectable } from '@nestjs/common';
import { NotificationChannel } from '@contracts/notifications';
import { Clock } from '@platform/kernel';
import { NotificationsDefaults } from '../../../shared/constants/notifications-defaults.constants.js';
import { EmailFacade, NotificationEmailKey } from '../../email/index.js';
import { PushFacade } from '../../push/index.js';
import { DeliveryStatus, type Delivery } from '../domain/delivery.js';
import { DeliveryRetrySchedule } from '../domain/delivery-retry-schedule.js';
import type { Recipient } from '../domain/recipient.js';

/**
 * Entrega una notificación por correo o push y devuelve la entrega con su resultado. Un fallo queda en la
 * entrega para que el job la reintente con espera creciente; después de `maxDeliveryAttempts` se abandona.
 */
@Injectable()
export class ChannelDeliverer {
  constructor(
    private readonly email: EmailFacade,
    private readonly push: PushFacade,
    private readonly clock: Clock,
  ) {}

  async deliver(delivery: Delivery, recipient: Recipient): Promise<Delivery> {
    const attempts = delivery.attempts + 1;
    try {
      const providerId = await this.send(delivery, recipient);
      return {
        ...delivery,
        attempts,
        status: DeliveryStatus.Sent,
        ...(providerId === undefined ? {} : { providerId }),
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

  /** El id del proveedor de correo; un push sale a varios dispositivos y no tiene uno solo. */
  private async send(
    delivery: Delivery,
    recipient: Recipient,
  ): Promise<string | undefined> {
    if (delivery.channel === NotificationChannel.Email) {
      return this.email.send({
        messageId: delivery.id,
        template: NotificationEmailKey.Notification,
        to: recipient.email,
        locale: delivery.locale,
        parameters: new Map([
          ['title', delivery.title],
          ['body', delivery.body],
        ]),
      });
    }
    await this.push.deliver(recipient.ref, {
      notificationId: delivery.notificationId,
      title: delivery.title,
      body: delivery.body,
    });
    return undefined;
  }
}
