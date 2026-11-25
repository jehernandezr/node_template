import { DomainError } from '@platform/kernel';
import { NotificationsErrorCode } from '@contracts/notifications';

/** The quiet hours do not have `HH:mm` times or the time zone does not exist. */
export class InvalidQuietHoursError extends DomainError {
  readonly code = NotificationsErrorCode.PreferencesInvalidQuietHours;

  constructor() {
    super('Quiet hours need HH:mm times and an IANA time zone');
  }
}
