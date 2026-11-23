import type { NotificationChannel } from '@contracts/notifications';

/** Cómo terminó la entrega de una notificación por un canal. */
export enum DeliveryStatus {
  /** Guardada con la notificación y todavía sin intentar. */
  Pending = 'pending',
  Sent = 'sent',
  Failed = 'failed',
  /** Falló `NotificationsDefaults.maxDeliveryAttempts` veces y no se reintenta más. */
  Abandoned = 'abandoned',
}

/** Lo que se entrega guarda su texto: el reintento no depende de la bandeja, que el usuario puede vaciar. */
export interface Delivery {
  readonly id: string;
  readonly notificationId: string;
  readonly userId: string;
  readonly homeTenantId: string;
  readonly channel: NotificationChannel;
  readonly status: DeliveryStatus;
  readonly attempts: number;
  /** Desde cuándo el job puede reintentarla si sigue pendiente o fallida. */
  readonly nextAttemptAt: Date;
  readonly title: string;
  readonly body: string;
  readonly locale: string;
  readonly providerId?: string;
  readonly error?: string;
}
