import { TenantVerifier } from '../../../dispatch/tenant-verifier.js';

/** Verificador que rechaza todo tenant, para probar la ruta a la DLQ. */
export class RejectingTenantVerifier extends TenantVerifier {
  verify(): Promise<boolean> {
    return Promise.resolve(false);
  }
}
