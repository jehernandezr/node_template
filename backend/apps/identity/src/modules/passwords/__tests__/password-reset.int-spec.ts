import { IdentityCommand, IdentityErrorCode } from '@contracts/identity';
import { ContainerRuntime } from '@platform/kernel/test-utils';
import {
  IdentityJourney,
  IdentityTestApp,
  QueuedCommands,
  ShardedUsers,
} from '../../../__tests__/utils/index.js';
import { IdentityEmailTemplate } from '../../../shared/enums/identity-email-template.enum.js';
import { PurgePasswordResetsJob } from '../application/purge-password-resets.job.js';
import { PasswordResetToken } from '../domain/password-reset-token.js';

const runtime = new ContainerRuntime(process.env);

const NEW_PHRASE = ['Another', 'new', 'phrase', 'to', 'return', '2026'].join(
  '-',
);
const SHORT_PHRASE = ['short', '1'].join('-');

runtime.describeIfAvailable('password resets in the shard of the user', () => {
  jest.setTimeout(180_000);

  const app = new IdentityTestApp();

  beforeAll(async () => {
    await app.start();
  });

  afterAll(async () => {
    await app.stop();
  });

  const requestReset = async (journey: IdentityJourney): Promise<string> => {
    const requested = await journey
      .native()
      .post('/v1/auth/password-resets', { body: { email: journey.email } });
    IdentityJourney.expectStatus(requested, 202);
    await new QueuedCommands(app).deliver(
      IdentityCommand.SendPasswordReset,
      journey.email,
    );
    return String(journey.mailTo(IdentityEmailTemplate.PasswordReset)['token']);
  };

  const traceOfRequest = async (email: string) => {
    const probe = app.shards();
    const count = `SELECT (SELECT count(*) FROM outbox) + (SELECT count(*) FROM password_resets) AS rows`;
    const before = await Promise.all(
      probe
        .names()
        .map((shard) => probe.rowsIn<{ rows: string }>(shard, count)),
    );
    const response = await app
      .nativeClient()
      .post('/v1/auth/password-resets', { body: { email } });
    const after = await Promise.all(
      probe
        .names()
        .map((shard) => probe.rowsIn<{ rows: string }>(shard, count)),
    );
    return {
      status: response.status,
      body: response.body,
      written: after.map(
        (rows, index) =>
          Number(rows[0]?.rows) - Number(before[index]?.[0]?.rows),
      ),
    };
  };

  const confirm = (
    journey: IdentityJourney,
    token: string,
    newPassword = NEW_PHRASE,
  ) =>
    journey.native().post('/v1/auth/password-resets/confirm', {
      body: { token, newPassword },
    });

  it('answers and writes the same for an email with an account and for one without', async () => {
    const [user] = [
      ...(await new ShardedUsers(app).oneInEachShard('same')).values(),
    ];

    const known = await traceOfRequest(String(user?.email));
    const unknown = await traceOfRequest('nobody.same@example.com');

    expect(unknown).toEqual(known);
    expect(known.written).toEqual(expect.arrayContaining([1]));
  });

  it('emails only the account of a known email once the worker answers the requests', async () => {
    const [user] = [
      ...(await new ShardedUsers(app).oneInEachShard('only-account')).values(),
    ];
    const known = new IdentityJourney(app, String(user?.email));
    const unknown = new IdentityJourney(app, 'nobody.only@example.com');
    await known
      .native()
      .post('/v1/auth/password-resets', { body: { email: known.email } });
    await unknown
      .native()
      .post('/v1/auth/password-resets', { body: { email: unknown.email } });

    await new QueuedCommands(app).deliver(
      IdentityCommand.SendPasswordReset,
      known.email,
    );
    await new QueuedCommands(app).deliver(
      IdentityCommand.SendPasswordReset,
      unknown.email,
    );

    expect(known.mailTo(IdentityEmailTemplate.PasswordReset)).toEqual({
      token: expect.any(String),
    });
    expect(() => unknown.mailTo(IdentityEmailTemplate.PasswordReset)).toThrow();
  });

  it('keeps each reset in the shard of its user and lets its token work once', async () => {
    const placed = await new ShardedUsers(app).oneInEachShard('recover');

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
      ...(await new ShardedUsers(app).oneInEachShard('policy')).values(),
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
      ...(await new ShardedUsers(app).oneInEachShard('forged')).values(),
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
    const placed = await new ShardedUsers(app).oneInEachShard('retention');
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
