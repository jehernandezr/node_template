import { SecurityAlerts } from '../../domain/security-alerts.js';
import type { SecurityAlert } from '../../domain/security-alert.js';

/** In-memory security alerts. */
export class InMemorySecurityAlerts extends SecurityAlerts {
  readonly raised: SecurityAlert[] = [];

  async raise(alert: SecurityAlert): Promise<void> {
    this.raised.push(alert);
  }
}
