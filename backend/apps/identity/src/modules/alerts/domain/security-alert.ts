import type { SecurityAlertType } from '@contracts/identity';
import type { UserRef } from '../../../shared/types/user-ref.type.js';

/** Security alert for a user. It carries no codes or secrets. */
export interface SecurityAlert {
  readonly type: SecurityAlertType;
  readonly user: UserRef;
  /** Data for the alert text: device, approximate city, method. Never secrets. */
  readonly context?: Readonly<Record<string, string>>;
}
