import { ShardScopes } from '@platform/persistence';
import { Injectable } from '@nestjs/common';
import type {
  AppNotification,
  NotificationPage,
} from '@contracts/notifications';
import type { PageQuery, UserRef } from '@contracts/platform';
import { IdCursor } from '@platform/criteria';
import { Clock } from '@platform/kernel';
import { NotificationsDefaults } from '../../../shared/constants/notifications-defaults.constants.js';
import { RealtimeFacade } from '../../realtime/index.js';
import { InboxRepository } from '../domain/inbox.repository.js';
import { NotificationNotFoundError } from '../domain/inbox.error.js';
import {
  NotificationViews,
  type NotificationState,
} from '../domain/notification.js';
import { InboxFacade } from './inbox.facade.js';

/**
 * The user's inbox in their shard. Every read that changes the unread count publishes it over real time
 * after it is saved, so the user's other tabs and devices see it without querying.
 */
@Injectable()
export class ManageInbox extends InboxFacade {
  constructor(
    private readonly inbox: InboxRepository,
    private readonly realtime: RealtimeFacade,
    private readonly shard: ShardScopes,
    private readonly clock: Clock,
    private readonly cursors: IdCursor,
  ) {
    super();
  }

  override async add(
    user: UserRef,
    notification: NotificationState,
  ): Promise<AppNotification> {
    const stored = await this.shard.inUserShard(user, () =>
      this.inbox.add(user, notification),
    );
    return NotificationViews.of(stored);
  }

  /**
   * Lists the user's notifications, newest first.
   * @param user Owner of the inbox.
   * @param query Cursor and page size.
   * @returns One page of notifications.
   */
  list(user: UserRef, query: PageQuery): Promise<NotificationPage> {
    const limit = query.limit ?? NotificationsDefaults.pageSize;
    const beforeId = this.cursors.idOf(query.after);
    return this.shard.inUserShard(user, async () => {
      const page = await this.inbox.page(user.userId, beforeId, limit + 1);
      const items = page.slice(0, limit);
      const last = items.at(-1);
      return {
        items: items.map((state) => NotificationViews.of(state)),
        nextCursor:
          page.length > limit && last !== undefined
            ? this.cursors.after(last.id)
            : null,
      };
    });
  }

  override unreadCount(user: UserRef): Promise<number> {
    return this.shard.inUserShard(user, () =>
      this.inbox.unreadCount(user.userId),
    );
  }

  /**
   * Marks one notification read and publishes the new unread count.
   * @param user Owner of the inbox.
   * @param notificationId Notification to mark.
   * @throws NotificationNotFoundError if it is not in the user's inbox.
   */
  async markRead(user: UserRef, notificationId: string): Promise<void> {
    const unread = await this.shard.inUserShard(user, async () => {
      if (
        !(await this.inbox.markRead(
          user.userId,
          notificationId,
          this.clock.now(),
        ))
      ) {
        throw new NotificationNotFoundError();
      }
      return this.inbox.unreadCount(user.userId);
    });
    await this.realtime.unreadCount(user, unread);
  }

  /**
   * Marks every notification of the user read and publishes the new unread count.
   * @param user Owner of the inbox.
   */
  async markAllRead(user: UserRef): Promise<void> {
    await this.shard.inUserShard(user, () =>
      this.inbox.markAllRead(user.userId, this.clock.now()),
    );
    await this.realtime.unreadCount(user, 0);
  }

  override erase(user: UserRef): Promise<number> {
    return this.shard.inUserShard(user, () => this.inbox.erase(user.userId));
  }
}
