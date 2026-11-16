import type { Page, UserRef } from '@contracts/platform';
import type {
  EmailTemplate,
  NotificationChannel,
  NotificationType,
  TemplateParameter,
} from '../enums/notifications.enum.js';

/** Notificación de la bandeja de un usuario. El texto lo genera el servidor en su idioma. */
export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
}

export type NotificationPage = Page<AppNotification>;

/** Cantidad de notificaciones sin leer de la bandeja. */
export interface UnreadCount {
  count: number;
}

/** Marca como leída una notificación de la bandeja del usuario. */
export interface MarkNotificationReadRequest {
  notificationId: string;
}

/** Canales por los que el usuario recibe un tipo de notificación. */
export interface NotificationPreferenceEntry {
  type: NotificationType;
  channels: NotificationChannel[];
}

/** Preferencias del usuario: tipos y canales, horario de silencio y zona horaria. */
export interface NotificationPreferences {
  enabled: NotificationPreferenceEntry[];
  /** Hora de inicio del silencio, `HH:mm`. */
  quietStart: string;
  /** Hora de fin del silencio, `HH:mm`. */
  quietEnd: string;
  /** Zona horaria IANA donde se aplica el silencio. */
  timezone: string;
}

/** Dato que llena una plantilla de correo o el texto de una notificación. */
export interface TemplateParameterValue {
  name: TemplateParameter;
  value: string;
}

/** Entrada de la operación que envía un correo transaccional. */
export interface SendEmailInput {
  messageId: string;
  template: EmailTemplate;
  to: string;
  locale?: string;
  parameters: TemplateParameterValue[];
}

/** Resultado de enviar un correo transaccional. */
export interface SendEmailResult {
  messageId: string;
}

/** Entrada de la operación que notifica a un usuario por sus canales. */
export interface NotifyUserInput {
  notificationId: string;
  user: UserRef;
  tenantId: string;
  type: NotificationType;
  parameters: TemplateParameterValue[];
}

/** Resultado de notificar a un usuario: los canales por los que salió. */
export interface NotifyUserResult {
  notificationId: string;
  channels: NotificationChannel[];
}

/** Entrada de la operación que borra los datos de notificaciones de un usuario. */
export interface EraseNotificationsUserInput {
  user: UserRef;
}

/** Resultado del borrado de datos de notificaciones de un usuario. */
export interface EraseNotificationsUserResult {
  userId: string;
  affectedRows: number;
}
