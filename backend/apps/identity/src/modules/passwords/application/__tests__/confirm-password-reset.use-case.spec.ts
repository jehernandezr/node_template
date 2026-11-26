import {
  IdentityErrorCode,
  RevocationReason,
  SecurityAlertType,
  UserStatus,
} from '@contracts/identity';
import { SystemRandomSource } from '@platform/kernel';
import { FixedClock, SequentialIdGenerator } from '@platform/kernel/test-utils';
import { InMemoryTransactionManager } from '@platform/messaging/test-utils';
import { UnroutedShardScopes } from '@platform/persistence/test-utils';
import { HmacSecretHasher } from '../../../../security/hmac-secret-hasher.js';
import { SecretGenerator } from '../../../../security/secret-generator.js';
import { InMemorySecurityAlerts } from '../../../alerts/__tests__/utils/index.js';
import { InMemorySessionsFacade } from '../../../sessions/__tests__/utils/index.js';
import { InMemoryUsersFacade } from '../../../users/__tests__/utils/index.js';
import {
  InMemoryPasswordCredentials,
  InMemoryPasswordResetRepository,
  ListedBreachedPasswords,
  ReversiblePasswordHasher,
} from '../../__tests__/utils/index.js';
import { ConfirmPasswordReset } from '../confirm-password-reset.use-case.js';
import { PasswordAcceptance } from '../password-acceptance.js';
import { PasswordResetTokens } from '../password-reset-tokens.js';
import { PasswordVerifier } from '../password-verifier.js';

const USER = {
  userId: '01941f29-7c00-7000-8000-000000000021',
  homeTenantId: '01941f29-7c00-7000-8000-000000000022',
};
const NEW_PASSWORD = 'correct horse battery staple 42';
const BREACHED = 'a long but widely leaked passphrase';

/** The use case over doubles of every port, with one active user. */
class ConfirmHarness {
  readonly clock = new FixedClock(new Date('2026-11-16T10:00:00.000Z'));
  readonly credentials = new InMemoryPasswordCredentials();
  readonly sessions = new InMemorySessionsFacade();
  readonly alerts = new InMemorySecurityAlerts();
  readonly users = new InMemoryUsersFacade().add({
    id: USER.userId,
    homeTenantId: USER.homeTenantId,
    email: 'ana@example.com',
    status: UserStatus.Active,
    displayName: 'Ana',
    locale: 'es',
  });
  private readonly scopes = UnroutedShardScopes.create();
  readonly tokens = new PasswordResetTokens(
    new InMemoryPasswordResetRepository(),
    new SecretGenerator(new SystemRandomSource()),
    new HmacSecretHasher(['test', 'reset', 'pepper'].join('-')),
    this.scopes,
    new SequentialIdGenerator(),
    this.clock,
  );
  readonly confirm = new ConfirmPasswordReset(
    this.tokens,
    new PasswordVerifier(
      this.credentials,
      new ReversiblePasswordHasher(),
      this.scopes,
      this.clock,
    ),
    new PasswordAcceptance(new ListedBreachedPasswords(BREACHED)),
    this.users,
    this.sessions,
    this.alerts,
    this.scopes,
    new InMemoryTransactionManager(),
  );
}

describe('ConfirmPasswordReset', () => {
  it('stores the new password, revokes every session of the user and raises the recovery alert', async () => {
    const harness = new ConfirmHarness();
    const token = await harness.tokens.issue(USER);

    await harness.confirm.execute({ token, newPassword: NEW_PASSWORD });

    expect(harness.credentials.rows.get(USER.userId)?.hash).toBe(
      `${ReversiblePasswordHasher.PREFIX}${NEW_PASSWORD}`,
    );
    expect(harness.sessions.revokedForUser).toEqual([
      { ref: USER, reason: RevocationReason.PasswordChanged },
    ]);
    expect(harness.alerts.raised).toEqual([
      { type: SecurityAlertType.PasswordRecovered, user: USER },
    ]);
  });

  it('refuses a token used before, and changes nothing', async () => {
    const harness = new ConfirmHarness();
    const token = await harness.tokens.issue(USER);
    await harness.confirm.execute({ token, newPassword: NEW_PASSWORD });

    await expect(
      harness.confirm.execute({ token, newPassword: `${NEW_PASSWORD} again` }),
    ).rejects.toMatchObject({ code: IdentityErrorCode.PasswordResetInvalid });
    expect(harness.credentials.rows.get(USER.userId)?.hash).toBe(
      `${ReversiblePasswordHasher.PREFIX}${NEW_PASSWORD}`,
    );
    expect(harness.alerts.raised).toHaveLength(1);
  });

  it('refuses a malformed token before touching any shard', async () => {
    const harness = new ConfirmHarness();

    await expect(
      harness.confirm.execute({
        token: 'not-a-token',
        newPassword: NEW_PASSWORD,
      }),
    ).rejects.toMatchObject({ code: IdentityErrorCode.PasswordResetInvalid });
    expect(harness.sessions.revokedForUser).toEqual([]);
  });

  it('refuses a breached password without revoking the sessions or alerting', async () => {
    const harness = new ConfirmHarness();
    const token = await harness.tokens.issue(USER);

    await expect(
      harness.confirm.execute({ token, newPassword: BREACHED }),
    ).rejects.toMatchObject({ code: IdentityErrorCode.PasswordBreached });
    expect(harness.credentials.rows.size).toBe(0);
    expect(harness.sessions.revokedForUser).toEqual([]);
    expect(harness.alerts.raised).toEqual([]);
  });
});
