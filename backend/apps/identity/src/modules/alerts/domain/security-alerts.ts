import type { SecurityAlert } from './security-alert.js';

/** Raises security alerts. The adapter publishes them as `identity.security-alert.raised.v1`. */
export abstract class SecurityAlerts {
  abstract raise(alert: SecurityAlert): Promise<void>;
}
