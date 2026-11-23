import { InMemoryAuthState } from '@platform/auth/test-utils';
import { RealtimeTestAuth } from '../../__tests__/utils/index.js';
import { AuthStateStreamRevocations } from '../auth-state-stream-revocations.js';

const principal = {
  userId: RealtimeTestAuth.USER_ID,
  tenantId: RealtimeTestAuth.TENANT_ID,
  homeTenantId: RealtimeTestAuth.HOME_TENANT_ID,
  sessionId: RealtimeTestAuth.SESSION_ID,
  sessionExpiresAt: 4_102_444_800,
};
const REVOKED_AT_SECONDS = 1_795_000_000;

describe('AuthStateStreamRevocations', () => {
  const revocationsWith = async (revokedBefore: number, suspended = false) => {
    const state = new InMemoryAuthState();
    await state.setTenantEpoch(RealtimeTestAuth.TENANT_ID, {
      revokedBefore,
      suspended,
    });
    return new AuthStateStreamRevocations(state);
  };

  it('revokes a connection opened in the same second as the revocation', async () => {
    const revocations = await revocationsWith(REVOKED_AT_SECONDS);

    await expect(
      revocations.revokedSince(
        principal,
        new Date(REVOKED_AT_SECONDS * 1000 + 999),
      ),
    ).resolves.toBe(true);
  });

  it('keeps a connection opened in a later second', async () => {
    const revocations = await revocationsWith(REVOKED_AT_SECONDS);

    await expect(
      revocations.revokedSince(
        principal,
        new Date((REVOKED_AT_SECONDS + 1) * 1000),
      ),
    ).resolves.toBe(false);
  });

  it('revokes every connection of a suspended tenant', async () => {
    const revocations = await revocationsWith(0, true);

    await expect(revocations.revokedSince(principal, new Date())).resolves.toBe(
      true,
    );
  });

  it('keeps the connections of a tenant without an epoch', async () => {
    const revocations = new AuthStateStreamRevocations(new InMemoryAuthState());

    await expect(revocations.revokedSince(principal, new Date())).resolves.toBe(
      false,
    );
  });
});
