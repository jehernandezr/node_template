import { TenantVerifier } from './tenant-verifier.js';

/**
 * Accepts any tenant. It is an explicit decision of the service: without a
 * verifier or `expectedTenantId`, the dispatcher rejects every envelope that
 * names a tenant.
 */
export class AcceptAnyTenantVerifier extends TenantVerifier {
  override verify(): Promise<boolean> {
    return Promise.resolve(true);
  }
}
