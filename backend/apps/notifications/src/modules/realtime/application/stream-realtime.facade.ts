import { Injectable } from '@nestjs/common';
import {
  NotificationFrameType,
  type AppNotification,
} from '@contracts/notifications';
import type { UserRef } from '@contracts/platform';
import { RealtimeFrames, RealtimePublisher } from '@platform/realtime';
import { RealtimeFacade } from './realtime.facade.js';

/** `RealtimeFacade` sobre el stream de tiempo real de cada usuario, que leen los transportes donde corran. */
@Injectable()
export class StreamRealtimeFacade extends RealtimeFacade {
  constructor(private readonly publisher: RealtimePublisher) {
    super();
  }

  async notification(
    user: UserRef,
    notification: AppNotification,
  ): Promise<void> {
    await this.publisher.publish(user.userId, {
      type: NotificationFrameType.Notification,
      data: notification,
    });
  }

  async unreadCount(user: UserRef, count: number): Promise<void> {
    await this.publisher.publish(user.userId, {
      type: NotificationFrameType.UnreadCount,
      data: { count },
    });
  }

  async closeSession(userId: string, sessionId: string): Promise<void> {
    await this.publisher.publish(userId, {
      type: NotificationFrameType.SessionClosed,
      data: { sessionId },
      closesSession: sessionId,
    });
  }

  async closeAllSessions(userId: string): Promise<void> {
    await this.closeSession(userId, RealtimeFrames.ALL_SESSIONS);
  }

  isOnline(user: UserRef): Promise<boolean> {
    return this.publisher.isOnline(user.userId);
  }
}
