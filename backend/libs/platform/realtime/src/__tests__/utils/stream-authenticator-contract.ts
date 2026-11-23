import { PlatformErrorCode } from '@contracts/platform';
import type { StreamAuthenticator } from '../../auth/stream-authenticator.js';
import type { StreamCredentials } from '../../auth/stream-credentials.js';
import { RealtimeTestAuth } from './realtime-test-auth.js';

/** Cómo lleva cada adaptador el token en la petición. */
export type CredentialsCarrier = (token: string) => StreamCredentials;

/** Lo que todo `StreamAuthenticator` cumple, con el token puesto donde ese adaptador lo busca. */
export function runStreamAuthenticatorContract(
  name: string,
  factory: (auth: RealtimeTestAuth) => StreamAuthenticator,
  carry: CredentialsCarrier,
): void {
  describe(`${name} (StreamAuthenticator contract)`, () => {
    let auth: RealtimeTestAuth;
    let authenticator: StreamAuthenticator;

    beforeAll(async () => {
      auth = await RealtimeTestAuth.create();
      authenticator = factory(auth);
    });

    it('identifies the user, tenants and session of a valid access token', async () => {
      const principal = await authenticator.authenticate(carry(auth.token()));

      expect(principal).toEqual({
        userId: RealtimeTestAuth.USER_ID,
        tenantId: RealtimeTestAuth.TENANT_ID,
        homeTenantId: RealtimeTestAuth.HOME_TENANT_ID,
        sessionId: RealtimeTestAuth.SESSION_ID,
        sessionExpiresAt: expect.any(Number),
      });
    });

    it('rejects a request without credentials', async () => {
      await expect(authenticator.authenticate({})).rejects.toMatchObject({
        code: PlatformErrorCode.AuthUnauthenticated,
      });
    });

    it('rejects a token signed by someone else', async () => {
      await expect(
        authenticator.authenticate(carry(auth.forgedToken())),
      ).rejects.toMatchObject({ code: PlatformErrorCode.AuthUnauthenticated });
    });
  });
}
