import type { NotificationChannel } from '@contracts/notifications';
import type { NotifyCommand } from './notify-command.js';

/** La entrada única de las notificaciones: el tipo fija la criticidad y las preferencias, los canales. */
export abstract class DispatchFacade {
  /** Devuelve los canales por los que salió; vacío si el usuario ya no existe. */
  abstract notify(
    command: NotifyCommand,
  ): Promise<readonly NotificationChannel[]>;
}
