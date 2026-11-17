import { PasswordResetToken } from '../password-reset-token.js';
import { PasswordReset } from '../password-reset.js';

const ISSUED_AT = new Date('2026-11-16T10:00:00.000Z');
const TTL_MS = 30 * 60_000;

function aReset(): PasswordReset {
  return PasswordReset.issue({
    id: '01941f29-7c00-7000-8000-000000000011',
    userId: '01941f29-7c00-7000-8000-000000000012',
    tokenHash: 'huella-del-secreto',
    expiresAt: new Date(ISSUED_AT.getTime() + TTL_MS),
  });
}

const genuine = (tokenHash: string) => tokenHash === 'huella-del-secreto';
const forged = () => false;

describe('PasswordReset', () => {
  describe('when a token is redeemed', () => {
    it('marks the reset as used the first time', () => {
      const reset = aReset();

      expect(reset.redeem(genuine, ISSUED_AT)).toBe(true);
      expect(reset.snapshot().usedAt).toEqual(ISSUED_AT);
    });

    it('refuses a second use', () => {
      const reset = aReset();
      reset.redeem(genuine, ISSUED_AT);

      expect(reset.redeem(genuine, ISSUED_AT)).toBe(false);
    });

    it('refuses it once it expired', () => {
      expect(
        aReset().redeem(genuine, new Date(ISSUED_AT.getTime() + TTL_MS)),
      ).toBe(false);
    });

    it('refuses a forged secret without using the reset', () => {
      const reset = aReset();

      expect(reset.redeem(forged, ISSUED_AT)).toBe(false);
      expect(reset.snapshot().usedAt).toBeUndefined();
    });
  });
});

describe('PasswordResetToken', () => {
  const secret = Buffer.alloc(32, 9);

  it('round-trips the route and the secret', () => {
    const parsed = PasswordResetToken.parse(
      new PasswordResetToken('u-1', 't-1', 'r-1', secret).format(),
    );

    expect(parsed).toMatchObject({
      userId: 'u-1',
      homeTenantId: 't-1',
      resetId: 'r-1',
    });
    expect(parsed?.secret.equals(secret)).toBe(true);
  });

  it.each(['pr2_u_t_r_abc', 'pr1_u_t', 'st1_u_t_r_abc', 'otro'])(
    'rejects %s',
    (text) => {
      expect(PasswordResetToken.parse(text)).toBeUndefined();
    },
  );
});
