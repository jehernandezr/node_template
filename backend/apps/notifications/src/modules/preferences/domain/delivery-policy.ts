import {
  NotificationChannel,
  NotificationPolicy,
  type NotificationType,
} from '@contracts/notifications';
import type { NotificationPreferences } from './notification-preferences.js';

/** Lo que la política necesita saber del momento de la entrega. */
export interface DeliveryContext {
  readonly type: NotificationType;
  readonly preferences: NotificationPreferences;
  readonly now: Date;
  /** El usuario tiene una conexión de tiempo real abierta. */
  readonly online: boolean;
}

/**
 * Elige los canales de una notificación. Los tipos obligatorios (alertas de seguridad) salen por todos y no
 * miran ni preferencias ni horario. El resto sale por los canales que el usuario eligió; en su horario de
 * silencio solo queda la bandeja, y con una conexión abierta el push sobra porque la bandeja ya le llega.
 * La bandeja siempre está: es el registro de lo que se le avisó.
 */
export class DeliveryPolicy {
  private static readonly ALL: readonly NotificationChannel[] =
    Object.values(NotificationChannel);

  channels(context: DeliveryContext): readonly NotificationChannel[] {
    if (
      (
        NotificationPolicy.mandatoryTypes as readonly NotificationType[]
      ).includes(context.type)
    ) {
      return DeliveryPolicy.ALL;
    }
    if (context.preferences.quietHours.contains(context.now)) {
      return [NotificationChannel.InApp];
    }
    const chosen = new Set(
      context.preferences.channelsFor(context.type) ?? DeliveryPolicy.ALL,
    );
    chosen.add(NotificationChannel.InApp);
    if (context.online) {
      chosen.delete(NotificationChannel.Push);
    }
    return DeliveryPolicy.ALL.filter((channel) => chosen.has(channel));
  }
}
