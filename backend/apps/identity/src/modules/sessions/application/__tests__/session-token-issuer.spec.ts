import { AuthMethodReference, ClientPlatform } from '@contracts/identity';
import { SystemRandomSource } from '@platform/kernel';
import { SecretGenerator } from '../../../../security/secret-generator.js';
import { HmacSecretHasher } from '../../../../security/hmac-secret-hasher.js';
import { InMemoryTokensFacade } from '../../../tokens/__tests__/utils/index.js';
import { Session } from '../../domain/session.js';
import { SessionToken } from '../../domain/session-token.js';
import { SessionTokenIssuer } from '../session-token-issuer.js';

const START = new Date('2026-11-16T10:00:00.000Z');
const DAY_MS = 86_400_000;

class IssuerHarness {
  readonly issuer = new SessionTokenIssuer(
    new InMemoryTokensFacade(),
    new SecretGenerator(new SystemRandomSource()),
    new HmacSecretHasher(['llave', 'de', 'prueba'].join('-')),
  );

  aSession(): Session {
    return Session.open({
      id: '01941f29-7c00-7000-8000-000000000001',
      userId: '01941f29-7c00-7000-8000-000000000002',
      homeTenantId: '01941f29-7c00-7000-8000-000000000003',
      activeTenantId: '01941f29-7c00-7000-8000-000000000003',
      deviceName: 'web',
      platform: ClientPlatform.Web,
      tokenSalt: this.issuer.newSalt(),
      generation: Session.FIRST_GENERATION,
      amr: [AuthMethodReference.Password],
      authTime: START,
      idleExpiresAt: new Date(START.getTime() + DAY_MS),
      absoluteExpiresAt: new Date(START.getTime() + 30 * DAY_MS),
      lastRefreshAt: START,
      ip: '203.0.113.5',
    });
  }

  tokenOf(session: Session): SessionToken {
    const token = SessionToken.parse(this.issuer.sessionToken(session));
    if (token === undefined) {
      throw new Error('El emisor armó un session token mal formado');
    }
    return token;
  }
}

describe('SessionTokenIssuer', () => {
  describe('when it checks a presented secret', () => {
    it('verifies an old generation after the session rotated', () => {
      const harness = new IssuerHarness();
      const session = harness.aSession();
      const first = harness.tokenOf(session);

      session.rotate(START, 5_000, DAY_MS);
      session.rotate(START, 5_000, DAY_MS);

      expect(harness.issuer.matches(session, 1, first.secret)).toBe(true);
      expect(harness.tokenOf(session).generation).toBe(3);
    });

    it('rejects a secret presented for another generation', () => {
      const harness = new IssuerHarness();
      const session = harness.aSession();
      const first = harness.tokenOf(session);
      session.rotate(START, 5_000, DAY_MS);

      expect(harness.issuer.matches(session, 2, first.secret)).toBe(false);
    });

    it('rejects a forged secret and the secret of another session', () => {
      const harness = new IssuerHarness();
      const session = harness.aSession();
      const other = harness.tokenOf(harness.aSession());

      expect(harness.issuer.matches(session, 1, Buffer.alloc(32, 7))).toBe(
        false,
      );
      expect(harness.issuer.matches(session, 1, other.secret)).toBe(false);
    });
  });
});
