import type { SecurityAlert } from './security-alert.js';

/** Raises security alerts. The adapter publishes them as `identity.security-alert.raised.v1`. */
export abstract class SecurityAlerts {
  /**
   * Raises a security alert for a user; it reaches the user through notifications.
   * @param alert Kind of alert and its user.
   */
  abstract raise(alert: SecurityAlert): Promise<void>;
}
