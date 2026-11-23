import { IdentityErrorCode } from '@contracts/identity';
import { ContainerRuntime } from '@platform/kernel/test-utils';
import {
  IdentityJourney,
  IdentityTestApp,
  ShardedUsers,
} from '../../../__tests__/utils/index.js';
import { IdentityEmailTemplate } from '../../../shared/enums/identity-email-template.enum.js';
import { PurgePasswordResetsJob } from '../application/purge-password-resets.job.js';
import { PasswordResetToken } from '../domain/password-reset-token.js';

const runtime = new ContainerRuntime(process.env);

const NEW_PHRASE = ['Otra', 'frase', 'nueva', 'para', 'volver', '2026'].join(
  '-',
);
const SHORT_PHRASE = ['corta', '1'].join('-');

runtime.describeIfAvailable('password resets in the shard of the user', () => {
  jest.setTimeout(180_000);

  const app = new IdentityTestApp();

  beforeAll(async () => {
    await app.start();
  });

  afterAll(async () => {
    await app.stop();
  });

  /** Pide la recuperación por HTTP y devuelve el token del correo. */
  const requestReset = async (journey: IdentityJourney): Promise<string> => {
    const requested = await journey
      .native()
      .post('/v1/auth/password-resets', { body: { email: journey.email } });
    IdentityJourney.expectStatus(requested, 202);
    return String(journey.mailTo(IdentityEmailTemplate.PasswordReset)['token']);
  };

  const confirm = (
    journey: IdentityJourney,
    token: string,
    newPassword = NEW_PHRASE,
  ) =>
    journey.native().post('/v1/auth/password-resets/confirm', {
      body: { token, newPassword },
    });

  it('keeps each reset in the shard of its user and lets its token work once', async () => {
    const placed = await new ShardedUsers(app).oneInEachShard('recupera');

    const outcomes = await Promise.all(
      [...placed].map(async ([shard, user]) => {
        const journey = new IdentityJourney(app, user.email);
        const token = await requestReset(journey);
        const first = await confirm(journey, token);
        const second = await confirm(journey, token);
        return {
          shard,
          first: first.status,
          second: second.body,
          rows: await app
            .shards()
            .shardsWith(
              `SELECT 1 FROM password_resets WHERE user_id = '${user.ref.userId}' AND used_at IS NOT NULL`,
            ),
        };
      }),
    );

    expect(outcomes).toEqual(
      [...placed.keys()].map((shard) => ({
        shard,
        first: 204,
        second: expect.objectContaining({
          code: IdentityErrorCode.PasswordResetInvalid,
        }),
        rows: [shard],
      })),
    );
  });

  it('leaves the token usable when the new password breaks the policy', async () => {
    const [user] = [
      ...(await new ShardedUsers(app).oneInEachShard('politica')).values(),
    ];
    const journey = new IdentityJourney(app, String(user?.email));
    const token = await requestReset(journey);

    const rejected = await confirm(journey, token, SHORT_PHRASE);
    const accepted = await confirm(journey, token);

    expect(rejected.body).toMatchObject({
      code: IdentityErrorCode.PasswordPolicyViolation,
    });
    expect(accepted.status).toBe(204);
  });

  it('refuses a token whose secret does not match', async () => {
    const [user] = [
      ...(await new ShardedUsers(app).oneInEachShard('forjado')).values(),
    ];
    const journey = new IdentityJourney(app, String(user?.email));
    const token = await requestReset(journey);
    const issued = PasswordResetToken.parse(token);
    const forged = new PasswordResetToken(
      String(issued?.userId),
      String(issued?.homeTenantId),
      String(issued?.resetId),
      Buffer.alloc(32, 3),
    ).format();

    const response = await confirm(journey, forged);

    expect(response.body).toMatchObject({
      code: IdentityErrorCode.PasswordResetInvalid,
    });
  });

  it('purges the resets that expired beyond the retention in every shard and keeps the recent ones', async () => {
    const placed = await new ShardedUsers(app).oneInEachShard('retencion');
    const tokens = await Promise.all(
      [...placed.values()].map((user) =>
        requestReset(new IdentityJourney(app, user.email)),
      ),
    );
    const [stale, fresh] = tokens.map((token) =>
      String(PasswordResetToken.parse(token)?.resetId),
    );
    const staleShard = [...placed.keys()][0];
    await app
      .shards()
      .rowsIn(
        String(staleShard),
        `UPDATE password_resets SET expires_at = now() - interval '8 days' WHERE id = '${stale}' RETURNING id`,
      );

    await app.get(PurgePasswordResetsJob).run();

    await expect(
      app
        .shards()
        .shardsWith(`SELECT 1 FROM password_resets WHERE id = '${stale}'`),
    ).resolves.toEqual([]);
    await expect(
      app
        .shards()
        .shardsWith(`SELECT 1 FROM password_resets WHERE id = '${fresh}'`),
    ).resolves.toHaveLength(1);
  });
});
