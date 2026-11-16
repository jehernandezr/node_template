import type { SecurityAlertType } from '../enums/user.enum.js';

/** Payload de `identity.security-alert.raised.v1`. Nunca incluye códigos ni secretos. */
export interface SecurityAlertRaisedPayload {
  alertId: string;
  userId: string;
  type: SecurityAlertType;
  raisedAt: string;
}
