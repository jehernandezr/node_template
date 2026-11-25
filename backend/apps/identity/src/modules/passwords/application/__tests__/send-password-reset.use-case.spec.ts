import { UnroutedShardScopes } from '@platform/persistence/test-utils';
import { UserStatus } from '@contracts/identity';
import { SystemRandomSource } from '@platform/kernel';
import { FixedClock, SequentialIdGenerator } from '@platform/kernel/test-utils';
import { HmacSecretHasher } from '../../../../security/hmac-secret-hasher.js';
import { SecretGenerator } from '../../../../security/secret-generator.js';
import { IdentityEmailTemplate } from '../../../../shared/enums/identity-email-template.enum.js';
import { InMemoryIdentityMailer } from '../../../alerts/__tests__/utils/index.js';
import { InMemoryUsersFacade } from '../../../users/__tests__/utils/index.js';
import { InMemoryPasswordResetRepository } from '../../__tests__/utils/index.js';
import { PasswordResetTokens } from '../password-reset-tokens.js';
import { SendPasswordReset } from '../send-password-reset.use-case.js';

const HOME_TENANT = '01941f29-7c00-7000-8000-0000000000d0';

/** The use case over in-memory users, resets and mailer. */
class SendHarness {
  readonly users = new InMemoryUsersFacade();
  readonly resets = new InMemoryPasswordResetRepository();
  readonly mailer = new InMemoryIdentityMailer();
  readonly send = new SendPasswordReset(
    this.users,
    new PasswordResetTokens(
      this.resets,
      new SecretGenerator(new SystemRandomSource()),
      new HmacSecretHasher(['test', 'secret', 'key'].join('-')),
      UnroutedShardScopes.create(),
      new SequentialIdGenerator(),
      new FixedClock(new Date('2026-11-25T10:00:00.000Z')),
    ),
    this.mailer,
  );

  withUser(email: string, status: UserStatus): this {
    this.users.add({
      id: '01941f29-7c00-7000-8000-0000000000d1',
      homeTenantId: HOME_TENANT,
      email,
      status,
      displayName: 'Ana',
      locale: 'es',
    });
    return this;
  }
}

describe('SendPasswordReset', () => {
  describe('an email with an active account', () => {
    it('stores one reset and emails its token in the language of the user', async () => {
      const harness = new SendHarness().withUser(
        'ana@example.com',
        UserStatus.Active,
      );

      await harness.send.execute('ana@example.com');

      expect(harness.resets.rows.size).toBe(1);
      expect(harness.mailer.sent).toEqual([
        {
          template: IdentityEmailTemplate.PasswordReset,
          to: 'ana@example.com',
          locale: 'es',
          variables: { token: expect.any(String) },
        },
      ]);
    });
  });

  describe.each([[UserStatus.Suspended], [UserStatus.Deleted]])(
    'an email whose account is %s',
    (status) => {
      it('neither stores a reset nor emails anything', async () => {
        const harness = new SendHarness().withUser('ana@example.com', status);

        await harness.send.execute('ana@example.com');

        expect(harness.resets.rows.size).toBe(0);
        expect(harness.mailer.sent).toEqual([]);
      });
    },
  );

  describe('an email without an account', () => {
    it('neither stores a reset nor emails anything', async () => {
      const harness = new SendHarness();

      await harness.send.execute('nobody@example.com');

      expect(harness.resets.rows.size).toBe(0);
      expect(harness.mailer.sent).toEqual([]);
    });
  });
});
