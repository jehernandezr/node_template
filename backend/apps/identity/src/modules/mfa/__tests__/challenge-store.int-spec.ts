import { MfaFactor } from '@contracts/identity';
import { ContainerRuntime } from '@platform/kernel/test-utils';
import {
  IdentityJourney,
  IdentityTestApp,
  ShardedUsers,
  TestIds,
  TotpCodes,
} from '../../../__tests__/utils/index.js';
import { ChallengeStore } from '../domain/challenge-store.js';

const runtime = new ContainerRuntime(process.env);

runtime.describeIfAvailable('MFA challenges on Valkey', () => {
  jest.setTimeout(180_000);

  const app = new IdentityTestApp();
  let store: ChallengeStore;

  beforeAll(async () => {
    await app.start();
    store = app.get(ChallengeStore);
  });

  afterAll(async () => {
    await app.stop();
  });

  const save = async (): Promise<string> => {
    const id = TestIds.next();
    await store.save({
      id,
      pendingId: TestIds.next(),
      method: MfaFactor.EmailOtp,
      codeHash: 'huella',
      expiresAt: new Date(Date.now() + 60_000),
    });
    return id;
  };

  it('counts concurrent attempts without losing or repeating any', async () => {
    const id = await save();

    const counts = await Promise.all(
      Array.from({ length: 20 }, () => store.attempt(id)),
    );

    expect([...counts].sort((a, b) => a - b)).toEqual(
      Array.from({ length: 20 }, (_, i) => i + 1),
    );
  });

  it('lets only one of many concurrent verifications consume the challenge', async () => {
    const id = await save();

    const consumed = await Promise.all(
      Array.from({ length: 20 }, () => store.consume(id)),
    );

    expect(consumed.filter(Boolean)).toHaveLength(1);
    await expect(store.consume(id)).resolves.toBe(false);
  });

  it('counts the challenges of a pending sign-in inside its window', async () => {
    const pendingId = TestIds.next();

    const counts = await Promise.all(
      Array.from({ length: 5 }, () => store.countRequest(pendingId, 60_000)),
    );

    expect([...counts].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5]);
  });

  it('keeps the TOTP factor and the recovery codes of each user in the shard of the user', async () => {
    const placed = await new ShardedUsers(app).oneInEachShard('factor');
    const totp = new TotpCodes();

    const outcomes = await Promise.all(
      [...placed].map(async ([shard, user]) => {
        const journey = new IdentityJourney(app, user.email);
        const session = await journey.signInWithEmailCode();
        const me = journey.bearer(session.accessToken);
        const enrollment = await me.post('/v1/me/mfa/totp');
        const secret = (enrollment.body as { secret: string }).secret;
        const confirmed = await me.post('/v1/me/mfa/totp/confirm', {
          body: { code: totp.current(secret) },
        });
        const probe = app.shards();
        return {
          shard,
          confirmed: confirmed.status,
          factor: await probe.shardsWith(
            `SELECT 1 FROM totp_factors WHERE id = '${user.ref.userId}' AND confirmed_at IS NOT NULL`,
          ),
          codes: await probe.shardsWith(
            `SELECT 1 FROM recovery_codes WHERE user_id = '${user.ref.userId}'`,
          ),
        };
      }),
    );

    expect(outcomes).toEqual(
      [...placed.keys()].map((shard) => ({
        shard,
        confirmed: 200,
        factor: [shard],
        codes: [shard],
      })),
    );
  });
});
