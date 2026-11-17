import {
  AuthMethodReference,
  ClientPlatform,
  RevocationReason,
} from '@contracts/identity';
import { GenerationMatch, Session, type SessionState } from '../session.js';
import { SessionToken } from '../session-token.js';

const START = new Date('2026-11-16T10:00:00.000Z');
const DAY_MS = 86_400_000;
const GRACE_MS = 5_000;

function aSession(overrides: Partial<SessionState> = {}): Session {
  return Session.open({
    id: '01941f29-7c00-7000-8000-000000000001',
    userId: '01941f29-7c00-7000-8000-000000000002',
    homeTenantId: '01941f29-7c00-7000-8000-000000000003',
    activeTenantId: '01941f29-7c00-7000-8000-000000000003',
    deviceName: 'web',
    platform: ClientPlatform.Web,
    tokenSalt: 'sal-de-la-sesion',
    generation: 1,
    amr: [AuthMethodReference.Password],
    authTime: START,
    idleExpiresAt: new Date(START.getTime() + DAY_MS),
    absoluteExpiresAt: new Date(START.getTime() + 30 * DAY_MS),
    lastRefreshAt: START,
    ip: '203.0.113.5',
    ...overrides,
  });
}

/** Un verificador que solo acepta el secreto verdadero de las generaciones dadas. */
const genuineFor =
  (...generations: number[]) =>
  (generation: number) =>
    generations.includes(generation);
const forged = () => false;

describe('Session', () => {
  describe('when a refresh presents a generation', () => {
    it('accepts the current generation with its secret', () => {
      expect(aSession().classify(1, genuineFor(1), START)).toBe(
        GenerationMatch.Current,
      );
    });

    it('accepts the previous generation inside the grace and flags it as reuse after it', () => {
      const session = aSession();
      session.rotate(START, GRACE_MS, DAY_MS);

      expect(
        session.classify(1, genuineFor(1), new Date(START.getTime() + 1_000)),
      ).toBe(GenerationMatch.Grace);
      expect(
        session.classify(
          1,
          genuineFor(1),
          new Date(START.getTime() + GRACE_MS),
        ),
      ).toBe(GenerationMatch.Reused);
    });

    it('flags an older generation as reuse only when its secret is genuine', () => {
      const session = aSession();
      session.rotate(START, GRACE_MS, DAY_MS);
      session.rotate(START, GRACE_MS, DAY_MS);

      expect(session.classify(1, genuineFor(1), START)).toBe(
        GenerationMatch.Reused,
      );
      expect(session.classify(2, genuineFor(2), START)).toBe(
        GenerationMatch.Grace,
      );
    });

    it('treats an old generation with a forged secret as unknown', () => {
      const session = aSession();
      session.rotate(START, GRACE_MS, DAY_MS);
      session.rotate(START, GRACE_MS, DAY_MS);

      expect(session.classify(1, forged, START)).toBe(GenerationMatch.Unknown);
    });

    it.each([
      ['a future generation', 4],
      ['generation zero', 0],
    ])('does not trust %s', (_case, generation) => {
      const session = aSession();
      session.rotate(START, GRACE_MS, DAY_MS);
      session.rotate(START, GRACE_MS, DAY_MS);

      expect(session.classify(generation, genuineFor(generation), START)).toBe(
        GenerationMatch.Unknown,
      );
    });

    it('does not trust the current generation with a forged secret', () => {
      expect(aSession().classify(1, forged, START)).toBe(
        GenerationMatch.Unknown,
      );
    });
  });

  it('extends the idle expiry on rotation without passing the absolute cap', () => {
    const session = aSession({
      absoluteExpiresAt: new Date(START.getTime() + DAY_MS / 2),
    });

    session.rotate(START, GRACE_MS, DAY_MS);

    expect(session.snapshot().generation).toBe(2);
    expect(session.snapshot().idleExpiresAt).toEqual(
      new Date(START.getTime() + DAY_MS / 2),
    );
  });

  it('expires at the idle or the absolute limit', () => {
    const session = aSession();

    expect(session.isExpired(new Date(START.getTime() + DAY_MS - 1))).toBe(
      false,
    );
    expect(session.isExpired(new Date(START.getTime() + DAY_MS))).toBe(true);
  });

  it('revokes once and keeps the reason', () => {
    const session = aSession();

    expect(session.revoke(RevocationReason.Logout, START)).toBe(true);
    expect(session.revoke(RevocationReason.Compromised, START)).toBe(false);
    expect(session.snapshot().revocationReason).toBe(RevocationReason.Logout);
  });

  it('adds the step-up method and moves the auth time', () => {
    const session = aSession();
    const at = new Date(START.getTime() + 60_000);

    session.markMfaVerified(at, [
      AuthMethodReference.Totp,
      AuthMethodReference.Password,
    ]);
    session.switchTenant('01941f29-7c00-7000-8000-000000000009');

    expect(session.snapshot()).toMatchObject({
      amr: [AuthMethodReference.Password, AuthMethodReference.Totp],
      authTime: at,
      mfaVerifiedAt: at,
      activeTenantId: '01941f29-7c00-7000-8000-000000000009',
    });
  });
});

describe('SessionToken', () => {
  const secret = Buffer.from('secreto-de-prueba-de-32-bytes!!');

  it('round-trips the route and the secret', () => {
    const token = new SessionToken('u-1', 't-1', 's-1', 7, secret);

    const parsed = SessionToken.parse(token.format());

    expect(parsed).toMatchObject({
      userId: 'u-1',
      homeTenantId: 't-1',
      sessionId: 's-1',
      generation: 7,
    });
    expect(parsed?.secret.equals(secret)).toBe(true);
  });

  it.each(['st2_u_t_s_1_abc', 'st1_u_t_s_x_abc', 'st1_u_t', 'otro'])(
    'rejects %s',
    (text) => {
      expect(SessionToken.parse(text)).toBeUndefined();
    },
  );
});
