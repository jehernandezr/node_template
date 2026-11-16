import type { AccessGrant } from './access-grant.js';

/**
 * Fuente de verdad del acceso: identity la implementa en proceso con su fachada
 * `access`, y los demás servicios con la operación interna `GetUserAccess`.
 */
export abstract class AccessGrantSource {
  abstract fetch(tenantId: string, userId: string): Promise<AccessGrant>;
}
