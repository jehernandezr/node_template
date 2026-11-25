import { TenantVerifier } from '../../../dispatch/tenant-verifier.js';

/** Verifier that rejects every tenant, to test the path to the DLQ. */
export class RejectingTenantVerifier extends TenantVerifier {
  verify(): Promise<boolean> {
    return Promise.resolve(false);
  }
}
