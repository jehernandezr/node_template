import { IdentityErrorCode } from '@contracts/identity';
import { ContainerRuntime } from '@platform/kernel/test-utils';
import {
  IdentityTestApp,
  ShardedUsers,
} from '../../../__tests__/utils/index.js';
import { RotateLoginAttemptPartitionsJob } from '../application/rotate-login-attempt-partitions.job.js';

const runtime = new ContainerRuntime(process.env);

runtime.describeIfAvailable('login attempts in monthly partitions', () => {
  jest.setTimeout(180_000);

  const app = new IdentityTestApp();

  beforeAll(async () => {
    await app.start();
  });

  afterAll(async () => {
    await app.stop();
  });

  /** `login_attempts_AAAAMM` del mes de `at`, el nombre que le dan las funciones de la plataforma. */
  const partitionOf = (at: Date): string =>
    `login_attempts_${at.getUTCFullYear()}${String(at.getUTCMonth() + 1).padStart(2, '0')}`;

  it('creates the table partitioned by month on both shards', async () => {
    const probe = app.shards();

    expect(
      await probe.shardsWith(
        `SELECT 1 FROM pg_partitioned_table p JOIN pg_class c ON c.oid = p.partrelid WHERE c.relname = 'login_attempts'`,
      ),
    ).toEqual([...probe.names()]);
    expect(
      await probe.shardsWith(
        `SELECT 1 FROM pg_class WHERE relname = '${partitionOf(new Date())}'`,
      ),
    ).toEqual([...probe.names()]);
  });

  it('records a failed attempt in the partition of the month, in the shard of the user', async () => {
    const probe = app.shards();
    const placed = await new ShardedUsers(app).oneInEachShard('intento');

    for (const [shard, { ref, email }] of placed) {
      const failed = await app.client('192.0.2.77').post('/v1/auth/sign-in', {
        body: { email, password: 'una-clave-que-no-es-la-suya' },
      });

      expect(failed.body).toMatchObject({
        code: IdentityErrorCode.AuthInvalidCredentials,
      });
      expect(
        await probe.rowsIn(
          shard,
          `SELECT tableoid::regclass::text AS partition FROM login_attempts WHERE user_id = '${ref.userId}'`,
        ),
      ).toEqual([{ partition: partitionOf(new Date()) }]);
      expect(
        await probe.shardsWith(
          `SELECT 1 FROM login_attempts WHERE user_id = '${ref.userId}'`,
        ),
      ).toEqual([shard]);
    }
  });

  it('records a failed attempt with an email without an account as it records one with an account', async () => {
    const [user] = [
      ...(await new ShardedUsers(app).oneInEachShard('sin-cuenta')).values(),
    ];
    const totalAttempts = async (): Promise<number> => {
      const probe = app.shards();
      const counts = await Promise.all(
        probe
          .names()
          .map((shard) =>
            probe.rowsIn<{ attempts: string }>(
              shard,
              'SELECT count(*) AS attempts FROM login_attempts',
            ),
          ),
      );
      return counts
        .flat()
        .reduce((total, row) => total + Number(row.attempts), 0);
    };
    const attemptWith = async (email: string) => {
      const before = await totalAttempts();
      const failed = await app.client('192.0.2.78').post('/v1/auth/sign-in', {
        body: { email, password: 'una-clave-que-no-es-la-suya' },
      });
      return {
        status: failed.status,
        code: (failed.body as { code?: string }).code,
        added: (await totalAttempts()) - before,
      };
    };

    const known = await attemptWith(String(user?.email));
    const unknown = await attemptWith('nadie.intento@example.com');

    expect(unknown).toEqual(known);
    expect(known).toMatchObject({
      code: IdentityErrorCode.AuthInvalidCredentials,
      added: 1,
    });
  });

  it('drops the partitions past the retention and keeps months ahead', async () => {
    const probe = app.shards();
    const [shard] = probe.names();
    await probe.rowsIn(
      shard ?? '',
      `CREATE TABLE login_attempts_202001 PARTITION OF login_attempts FOR VALUES FROM (platform_uuid_v7_lower_bound('2020-01-01')) TO (platform_uuid_v7_lower_bound('2020-02-01'))`,
    );

    await app.get(RotateLoginAttemptPartitionsJob).run();

    const ahead = new Date();
    ahead.setUTCMonth(ahead.getUTCMonth() + 3, 1);
    expect(
      await probe.shardsWith(
        `SELECT 1 FROM pg_class WHERE relname = 'login_attempts_202001'`,
      ),
    ).toEqual([]);
    expect(
      await probe.shardsWith(
        `SELECT 1 FROM pg_class WHERE relname = '${partitionOf(ahead)}'`,
      ),
    ).toEqual([...probe.names()]);
  });
});
