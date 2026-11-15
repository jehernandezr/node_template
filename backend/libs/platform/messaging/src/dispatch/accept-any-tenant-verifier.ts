import { TenantVerifier } from './tenant-verifier.js';

/**
 * Acepta cualquier tenant. Es una decisión explícita del servicio: sin
 * verificador ni `expectedTenantId`, el dispatcher rechaza todo sobre que
 * nombre un tenant.
 */
export class AcceptAnyTenantVerifier extends TenantVerifier {
  verify(): Promise<boolean> {
    return Promise.resolve(true);
  }
}
