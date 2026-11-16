import type { SecurityAlert } from './security-alert.js';

/** Levanta avisos de seguridad. El adaptador los publica como `identity.security-alert.raised.v1`. */
export abstract class SecurityAlerts {
  abstract raise(alert: SecurityAlert): Promise<void>;
}
