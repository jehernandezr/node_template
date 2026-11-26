import { ShardScopes } from '@platform/persistence';
import { Injectable } from '@nestjs/common';
import {
  NotificationChannel,
  NotificationCreatedEvent,
} from '@contracts/notifications';
import { Clock, IdGenerator, TransactionManager } from '@platform/kernel';
import { MessageBus } from '@platform/messaging';
import { InboxFacade } from '../../inbox/index.js';
import { DeliveryPolicy, PreferencesFacade } from '../../preferences/index.js';
import { RealtimeFacade } from '../../realtime/index.js';
import { DeliveryStatus, type Delivery } from '../domain/delivery.js';
import { DeliveryRepository } from '../domain/delivery.repository.js';
import { DeliveryRetrySchedule } from '../domain/delivery-retry-schedule.js';
import {
  NotificationTexts,
  type NotificationText,
} from '../domain/notification-texts.js';
import type { Recipient } from '../domain/recipient.js';
import { RecipientDirectory } from '../domain/recipient-directory.js';
import { ChannelDeliverer } from './channel-deliverer.js';
import type { NotifyCommand } from './notify-command.js';

/**
 * Notifies a user. The inbox, the pending deliveries and the event are stored together in the user's
 * shard; real time, email and push go out after the commit. If the process crashes before sending,
 * the retry job finds the pending deliveries. A repeated notification returns the channels it already had.
 */
@Injectable()
export class NotifyUser {
  private readonly policy = new DeliveryPolicy();

  constructor(
    private readonly recipients: RecipientDirectory,
    private readonly preferences: PreferencesFacade,
    private readonly inbox: InboxFacade,
    private readonly realtime: RealtimeFacade,
    private readonly deliveries: DeliveryRepository,
    private readonly deliverer: ChannelDeliverer,
    private readonly bus: MessageBus,
    private readonly shard: ShardScopes,
    private readonly transactions: TransactionManager,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  /**
   * Notifies the user and returns the channels it went out through; empty if the user no longer exists.
   * @param command User, type, parameters and idempotency id.
   * @returns The channels used.
   */
  async notify(
    command: NotifyCommand,
  ): Promise<readonly NotificationChannel[]> {
    const previous = await this.shard.inUserShard(command.user, () =>
      this.deliveries.ofNotification(command.notificationId),
    );
    if (previous.length > 0) {
      return previous.map((delivery) => delivery.channel);
    }
    const recipient = await this.recipients.find(command.user.userId);
    if (recipient === undefined) {
      return [];
    }
    const now = this.clock.now();
    const channels = this.policy.channels({
      type: command.type,
      preferences: await this.preferences.get(command.user),
      now,
      online: await this.realtime.isOnline(command.user),
    });
    const text = NotificationTexts.of(
      command.type,
      recipient.locale,
      command.parameters,
    );
    const pending = channels.map((channel) =>
      this.deliveryOf(command, channel, text, recipient.locale, now),
    );
    const notification = await this.shard.inUserShard(command.user, () =>
      this.transactions.runInTransaction(async () => {
        const stored = await this.inbox.add(command.user, {
          id: command.notificationId,
          userId: command.user.userId,
          type: command.type,
          ...text,
          locale: recipient.locale,
          createdAt: now,
        });
        for (const delivery of pending) {
          await this.deliveries.save(delivery);
        }
        await this.bus.publish(
          NotificationCreatedEvent,
          {
            notificationId: command.notificationId,
            tenantId: command.tenantId,
            type: command.type,
            channels: [...channels],
            createdAt: now.toISOString(),
          },
          { tenantId: command.tenantId },
        );
        return stored;
      }),
    );
    await this.realtime.notification(command.user, notification);
    await this.realtime.unreadCount(
      command.user,
      await this.inbox.unreadCount(command.user),
    );
    await this.sendOutOfApp(pending, recipient);
    return channels;
  }

  private deliveryOf(
    command: NotifyCommand,
    channel: NotificationChannel,
    text: NotificationText,
    locale: string,
    now: Date,
  ): Delivery {
    return {
      ...text,
      locale,
      id: this.ids.next().toString(),
      notificationId: command.notificationId,
      userId: command.user.userId,
      homeTenantId: command.user.homeTenantId,
      channel,
      status:
        channel === NotificationChannel.InApp
          ? DeliveryStatus.Sent
          : DeliveryStatus.Pending,
      attempts: 0,
      nextAttemptAt: DeliveryRetrySchedule.firstRetryAt(now),
    };
  }

  private async sendOutOfApp(
    pending: readonly Delivery[],
    recipient: Recipient,
  ): Promise<void> {
    const outOfApp = pending.filter(
      (delivery) => delivery.channel !== NotificationChannel.InApp,
    );
    for (const delivery of outOfApp) {
      const result = await this.deliverer.deliver(delivery, recipient);
      await this.shard.inUserShard(recipient.ref, () =>
        this.deliveries.save(result),
      );
    }
  }
}
