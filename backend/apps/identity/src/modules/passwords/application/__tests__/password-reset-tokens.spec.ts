import { UnroutedShardScopes } from '@platform/persistence/test-utils';
import { SystemRandomSource } from '@platform/kernel';
import { FixedClock, SequentialIdGenerator } from '@platform/kernel/test-utils';
import { SecretGenerator } from '../../../../security/secret-generator.js';
import { HmacSecretHasher } from '../../../../security/hmac-secret-hasher.js';
import { InMemoryPasswordResetRepository } from '../../__tests__/utils/index.js';
import { PasswordResetToken } from '../../domain/password-reset-token.js';
import { PasswordResetTokens } from '../password-reset-tokens.js';

const USER = {
  userId: '01941f29-7c00-7000-8000-000000000021',
  homeTenantId: '01941f29-7c00-7000-8000-000000000022',
};
const TTL_MS = 30 * 60_000;

class TokensHarness {
  readonly clock = new FixedClock(new Date('2026-11-16T10:00:00.000Z'));
  readonly repository = new InMemoryPasswordResetRepository();
  readonly tokens = new PasswordResetTokens(
    this.repository,
    new SecretGenerator(new SystemRandomSource()),
    new HmacSecretHasher(['test', 'secret', 'key'].join('-')),
    UnroutedShardScopes.create(),
    new SequentialIdGenerator(),
    this.clock,
  );
}

describe('PasswordResetTokens', () => {
  describe('when a token is issued', () => {
    it('keeps only the hash of its secret and routes to the user', async () => {
      const harness = new TokensHarness();

      const text = await harness.tokens.issue(USER);

      const token = PasswordResetToken.parse(text);
      const [stored] = [...harness.repository.rows.values()];
      expect(harness.tokens.ownerOf(text)).toEqual(USER);
      expect(stored?.snapshot().tokenHash).not.toContain(
        token?.secret.toString('base64url'),
      );
      expect(stored?.snapshot().expiresAt).toEqual(
        new Date(harness.clock.now().getTime() + TTL_MS),
      );
    });
  });

  describe('when a token is redeemed', () => {
    it('accepts it once', async () => {
      const harness = new TokensHarness();
      const text = await harness.tokens.issue(USER);

      const first = await harness.tokens.redeem(text);
      const second = await harness.tokens.redeem(text);

      expect([first, second]).toEqual([true, false]);
    });

    it('refuses a token with a forged secret', async () => {
      const harness = new TokensHarness();
      const issued = PasswordResetToken.parse(await harness.tokens.issue(USER));
      const forged = new PasswordResetToken(
        USER.userId,
        USER.homeTenantId,
        String(issued?.resetId),
        Buffer.alloc(32, 1),
      ).format();

      await expect(harness.tokens.redeem(forged)).resolves.toBe(false);
    });

    it('refuses a token past its expiry', async () => {
      const harness = new TokensHarness();
      const text = await harness.tokens.issue(USER);
      harness.clock.advance(TTL_MS);

      await expect(harness.tokens.redeem(text)).resolves.toBe(false);
    });

    it.each(['pr1_malformed', 'other'])(
      'refuses the malformed token %s',
      async (text) => {
        const harness = new TokensHarness();

        await expect(harness.tokens.redeem(text)).resolves.toBe(false);
        expect(harness.tokens.ownerOf(text)).toBeUndefined();
      },
    );
  });
});
