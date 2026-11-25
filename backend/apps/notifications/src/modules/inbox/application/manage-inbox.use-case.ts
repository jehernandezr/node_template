import { Injectable } from '@nestjs/common';
import type {
  AppNotification,
  NotificationPage,
} from '@contracts/notifications';
import type { PageQuery, UserRef } from '@contracts/platform';
import { CursorCodec } from '@platform/criteria';
import { Clock } from '@platform/kernel';
import { NotificationsDefaults } from '../../../shared/constants/notifications-defaults.constants.js';
import { UserShard } from '../../../shared/utils/user-shard.js';
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
  private readonly cursors = new CursorCodec();

  constructor(
    private readonly inbox: InboxRepository,
    private readonly realtime: RealtimeFacade,
    private readonly shard: UserShard,
    private readonly clock: Clock,
  ) {
    super();
  }

  async add(
    user: UserRef,
    notification: NotificationState,
  ): Promise<AppNotification> {
    const stored = await this.shard.run(user, () =>
      this.inbox.add(user, notification),
    );
    return NotificationViews.of(stored);
  }

  list(user: UserRef, query: PageQuery): Promise<NotificationPage> {
    const limit = query.limit ?? NotificationsDefaults.pageSize;
    const beforeId =
      query.after === undefined
        ? undefined
        : this.cursors.decode(query.after).id;
    return this.shard.run(user, async () => {
      const page = await this.inbox.page(user.userId, beforeId, limit + 1);
      const items = page.slice(0, limit);
      const last = items.at(-1);
      return {
        items: items.map((state) => NotificationViews.of(state)),
        nextCursor:
          page.length > limit && last !== undefined
            ? this.cursors.encode({ id: last.id, values: [] })
            : null,
      };
    });
  }

  unreadCount(user: UserRef): Promise<number> {
    return this.shard.run(user, () => this.inbox.unreadCount(user.userId));
  }

  /** @throws NotificationNotFoundError if it is not in the user's inbox. */
  async markRead(user: UserRef, notificationId: string): Promise<void> {
    const unread = await this.shard.run(user, async () => {
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

  async markAllRead(user: UserRef): Promise<void> {
    await this.shard.run(user, () =>
      this.inbox.markAllRead(user.userId, this.clock.now()),
    );
    await this.realtime.unreadCount(user, 0);
  }

  erase(user: UserRef): Promise<number> {
    return this.shard.run(user, () => this.inbox.erase(user.userId));
  }
}
