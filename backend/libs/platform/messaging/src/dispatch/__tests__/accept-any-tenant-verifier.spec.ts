import { AcceptAnyTenantVerifier } from '../accept-any-tenant-verifier.js';
import { TenantVerifier } from '../tenant-verifier.js';

describe('AcceptAnyTenantVerifier', () => {
  it('accepts any tenant', async () => {
    const verifier = new AcceptAnyTenantVerifier();

    await expect(verifier.verify()).resolves.toBe(true);
  });

  it('is a tenant verifier, so a dispatcher can take it as its policy', () => {
    expect(new AcceptAnyTenantVerifier()).toBeInstanceOf(TenantVerifier);
  });
});
