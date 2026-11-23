import type {
  AppNotification,
  NotificationPreferences as PreferencesView,
} from '@contracts/notifications';
import type { UserRef } from '@contracts/platform';
import type { EmailFacade, EmailRequest } from '../../../email/index.js';
import { InboxFacade, type NotificationState } from '../../../inbox/index.js';
import {
  NotificationPreferences,
  PreferencesFacade,
} from '../../../preferences/index.js';
import type { PushFacade, PushMessage } from '../../../push/index.js';
import { RealtimeFacade } from '../../../realtime/index.js';
import type { Delivery } from '../../domain/delivery.js';
import { DeliveryRepository } from '../../domain/delivery.repository.js';
import type { Recipient } from '../../domain/recipient.js';
import { RecipientDirectory } from '../../domain/recipient-directory.js';

/** Preferencias fijas por usuario; sin ellas, ningún tipo configurado y sin horario de silencio. */
export class FixedPreferences extends PreferencesFacade {
  private readonly byUser = new Map<string, PreferencesView>();

  set(userId: string, view: PreferencesView): void {
    this.byUser.set(userId, view);
  }

  async get(user: UserRef): Promise<NotificationPreferences> {
    return NotificationPreferences.of(
      this.byUser.get(user.userId) ?? {
        enabled: [],
        quietStart: '00:00',
        quietEnd: '00:00',
        timezone: 'UTC',
      },
    );
  }

  async erase(user: UserRef): Promise<number> {
    return this.byUser.delete(user.userId) ? 1 : 0;
  }
}

/** Bandeja en memoria por usuario, idempotente por id como la real. */
export class InMemoryInbox extends InboxFacade {
  readonly stored = new Map<string, NotificationState>();

  async add(
    _user: UserRef,
    notification: NotificationState,
  ): Promise<AppNotification> {
    const kept = this.stored.get(notification.id) ?? notification;
    this.stored.set(kept.id, kept);
    return {
      id: kept.id,
      type: kept.type,
      title: kept.title,
      body: kept.body,
      createdAt: kept.createdAt.toISOString(),
      read: false,
    };
  }

  async unreadCount(user: UserRef): Promise<number> {
    return [...this.stored.values()].filter((n) => n.userId === user.userId)
      .length;
  }

  async erase(user: UserRef): Promise<number> {
    const mine = [...this.stored.values()].filter(
      (n) => n.userId === user.userId,
    );
    mine.forEach((n) => this.stored.delete(n.id));
    return mine.length;
  }
}

/** Tiempo real que guarda lo que se publica y dice que el usuario está conectado si se le pide. */
export class RecordingRealtime extends RealtimeFacade {
  readonly frames: Array<{ userId: string; kind: string; data: unknown }> = [];
  online = false;

  async notification(
    user: UserRef,
    notification: AppNotification,
  ): Promise<void> {
    this.frames.push({
      userId: user.userId,
      kind: 'notification',
      data: notification,
    });
  }

  async unreadCount(user: UserRef, count: number): Promise<void> {
    this.frames.push({
      userId: user.userId,
      kind: 'unread-count',
      data: count,
    });
  }

  async closeSession(userId: string, sessionId: string): Promise<void> {
    this.frames.push({ userId, kind: 'session-closed', data: sessionId });
  }

  async closeAllSessions(userId: string): Promise<void> {
    this.frames.push({ userId, kind: 'all-sessions-closed', data: null });
  }

  async isOnline(): Promise<boolean> {
    return this.online;
  }
}

export class InMemoryDeliveries extends DeliveryRepository {
  readonly byId = new Map<string, Delivery>();

  async save(delivery: Delivery): Promise<void> {
    this.byId.set(delivery.id, delivery);
  }

  async ofNotification(notificationId: string): Promise<readonly Delivery[]> {
    return [...this.byId.values()].filter(
      (d) => d.notificationId === notificationId,
    );
  }

  async erase(userId: string): Promise<number> {
    const mine = [...this.byId.values()].filter((d) => d.userId === userId);
    mine.forEach((d) => this.byId.delete(d.id));
    return mine.length;
  }

  all(): Delivery[] {
    return [...this.byId.values()];
  }
}

export class StaticRecipients extends RecipientDirectory {
  private readonly byId = new Map<string, Recipient>();

  add(recipient: Recipient): this {
    this.byId.set(recipient.ref.userId, recipient);
    return this;
  }

  async find(userId: string): Promise<Recipient | undefined> {
    return this.byId.get(userId);
  }
}

/** Correo que guarda los pedidos y puede fallar el próximo envío. */
export class RecordingEmail implements EmailFacade {
  readonly sent: EmailRequest[] = [];
  failures = 0;

  async send(request: EmailRequest): Promise<string> {
    if (this.failures > 0) {
      this.failures -= 1;
      throw new Error('provider unavailable');
    }
    this.sent.push(request);
    return `email-${this.sent.length}`;
  }
}

export class RecordingPush implements PushFacade {
  readonly sent: Array<{ user: UserRef; message: PushMessage }> = [];

  async deliver(user: UserRef, message: PushMessage): Promise<number> {
    this.sent.push({ user, message });
    return 1;
  }
}
