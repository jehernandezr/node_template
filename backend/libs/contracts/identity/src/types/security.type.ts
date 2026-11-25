import type { SecurityAlertType } from '../enums/user.enum.js';

/** Payload of `identity.security-alert.raised.v1`. It never includes codes or secrets. */
export interface SecurityAlertRaisedPayload {
  alertId: string;
  userId: string;
  type: SecurityAlertType;
  raisedAt: string;
}
