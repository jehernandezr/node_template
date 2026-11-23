import { DomainError } from '@platform/kernel';
import { NotificationsErrorCode } from '@contracts/notifications';

/** El horario de silencio no tiene horas `HH:mm` o la zona horaria no existe. */
export class InvalidQuietHoursError extends DomainError {
  readonly code = NotificationsErrorCode.PreferencesInvalidQuietHours;

  constructor() {
    super('Quiet hours need HH:mm times and an IANA time zone');
  }
}
