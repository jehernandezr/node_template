import { Injectable } from '@nestjs/common';
import {
  NotificationFrameType,
  type AppNotification,
} from '@contracts/notifications';
import type { UserRef } from '@contracts/platform';
import { RealtimeFrames, RealtimePublisher } from '@platform/realtime';
import { RealtimeFacade } from './realtime.facade.js';

/** `RealtimeFacade` over each user's real-time stream, read by the transports wherever they run. */
@Injectable()
export class StreamRealtimeFacade extends RealtimeFacade {
  constructor(private readonly publisher: RealtimePublisher) {
    super();
  }

  override async notification(
    user: UserRef,
    notification: AppNotification,
  ): Promise<void> {
    await this.publisher.publish(user.userId, {
      type: NotificationFrameType.Notification,
      data: notification,
    });
  }

  override async unreadCount(user: UserRef, count: number): Promise<void> {
    await this.publisher.publish(user.userId, {
      type: NotificationFrameType.UnreadCount,
      data: { count },
    });
  }

  override async closeSession(
    userId: string,
    sessionId: string,
  ): Promise<void> {
    await this.publisher.publish(userId, {
      type: NotificationFrameType.SessionClosed,
      data: { sessionId },
      closesSession: sessionId,
    });
  }

  override async closeAllSessions(userId: string): Promise<void> {
    await this.closeSession(userId, RealtimeFrames.ALL_SESSIONS);
  }

  override isOnline(user: UserRef): Promise<boolean> {
    return this.publisher.isOnline(user.userId);
  }
}
