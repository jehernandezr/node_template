import { ContainerRuntime } from '@platform/kernel/test-utils';
import { DataSource, type EntityManager } from 'typeorm';
import { SessionSetting } from '../enums.js';
import { PlatformPersistenceMigrations } from '../migrations/platform-persistence-migrations.js';
import { CreateProbes1794700000001 } from './utils/create-probes.migration.js';
import { DatabaseBootstrapLambda } from './utils/database-bootstrap-lambda.js';
import { IsolateProbes1794700000002 } from './utils/isolate-probes.migration.js';
import { TestDatabaseServer } from './utils/test-database-server.js';

const runtime = new ContainerRuntime(process.env);

runtime.describeIfAvailable('database roles of the bootstrap Lambda', () => {
  jest.setTimeout(120_000);
  const server = new TestDatabaseServer();
  const database = 'roles_probe_shard_0';
  const owner = 'roles_probe_owner';
  const app = 'roles_probe_app';
  const reader = 'roles_probe_reader';
  const tenantA = '0193f1c2-0000-7000-8000-00000000000a';
  const tenantB = '0193f1c2-0000-7000-8000-00000000000b';
  const insufficientPrivilege = { driverError: { code: '42501' } };
  const sources: DataSource[] = [];

  const connect = async (
    username: string,
    password: string,
  ): Promise<DataSource> => {
    const { host, port } = server.connection();
    const source = new DataSource({
      type: 'postgres',
      host,
      port,
      username,
      password,
      database,
      migrations: [
        ...PlatformPersistenceMigrations.shard,
        CreateProbes1794700000001,
        IsolateProbes1794700000002,
      ],
    });
    await source.initialize();
    sources.push(source);
    return source;
  };

  const asTenant = <T>(
    source: DataSource,
    tenant: string | null,
    work: (manager: EntityManager) => Promise<T>,
  ): Promise<T> =>
    source.transaction(async (manager) => {
      if (tenant !== null) {
        await manager.query('SELECT set_config($1, $2, true)', [
          SessionSetting.TenantId,
          tenant,
        ]);
      }
      return work(manager);
    });

  const insertProbe = (manager: EntityManager, tenant: string, name: string) =>
    manager.query(
      'INSERT INTO probes (id, version, tenant_id, name) VALUES (gen_random_uuid(), 1, $1, $2)',
      [tenant, name],
    );

  let ownerSource: DataSource;
  let appSource: DataSource;
  let adminSource: DataSource;

  beforeAll(async () => {
    const admin = server.connection();
    await server.drop([database]);
    adminSource = await new DataSource({
      type: 'postgres',
      host: admin.host,
      port: admin.port,
      username: admin.username,
      password: admin.password,
      database: admin.adminDatabase,
    }).initialize();
    sources.push(adminSource);
    await adminSource.query(
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'rds_iam') THEN CREATE ROLE rds_iam NOLOGIN; END IF; END $$`,
    );
    new DatabaseBootstrapLambda(admin, server.rolePassword()).run(
      [{ name: owner }, { name: app }, { name: reader, rds_iam: true }],
      [{ name: database, owner, writers: [app], readers: [reader] }],
    );
    ownerSource = await connect(owner, server.rolePassword());
    await ownerSource.runMigrations({ transaction: 'each' });
    appSource = await connect(app, server.rolePassword());
  });

  afterAll(async () => {
    for (const source of sources) {
      await source.destroy();
    }
    await server.drop([database]);
  });

  it('keeps the app role from creating, altering or dropping tables', async () => {
    await expect(
      appSource.query('CREATE TABLE intruder (id int)'),
    ).rejects.toMatchObject(insufficientPrivilege);
    await expect(
      appSource.query('ALTER TABLE probes ADD COLUMN intruder int'),
    ).rejects.toMatchObject(insufficientPrivilege);
    await expect(appSource.query('DROP TABLE probes')).rejects.toMatchObject(
      insufficientPrivilege,
    );
    await expect(
      appSource.query('ALTER TABLE probes DISABLE ROW LEVEL SECURITY'),
    ).rejects.toMatchObject(insufficientPrivilege);
  });

  it('shows the app role only the rows of the tenant of its transaction', async () => {
    await asTenant(appSource, tenantA, (manager) =>
      insertProbe(manager, tenantA, 'of-a'),
    );
    await asTenant(appSource, tenantB, (manager) =>
      insertProbe(manager, tenantB, 'of-b'),
    );

    const seenByA = await asTenant(appSource, tenantA, (manager) =>
      manager.query('SELECT name FROM probes ORDER BY name'),
    );
    const seenWithoutTenant = await asTenant(appSource, null, (manager) =>
      manager.query('SELECT name FROM probes'),
    );

    expect(seenByA).toEqual([{ name: 'of-a' }]);
    expect(seenWithoutTenant).toEqual([]);
    await expect(
      asTenant(appSource, tenantA, (manager) =>
        insertProbe(manager, tenantB, 'b-from-a'),
      ),
    ).rejects.toMatchObject(insufficientPrivilege);
  });

  it('lets the app role keep partitions through the platform functions only', async () => {
    const created: { created: number }[] = await appSource.query(
      `SELECT platform_ensure_partitions('audit_log', 'month', 6) AS created`,
    );
    const partitions: { name: string }[] = await appSource.query(
      `SELECT c.relname AS name FROM pg_inherits i JOIN pg_class c ON c.oid = i.inhrelid
       JOIN pg_class p ON p.oid = i.inhparent WHERE p.relname = 'audit_log' AND c.relname <> 'audit_log_default'
       ORDER BY c.relname DESC LIMIT 1`,
    );
    const newest = partitions[0]?.name ?? '';

    expect(created[0]?.created).toBeGreaterThan(0);
    await expect(
      appSource.query(`DROP TABLE "${newest}"`),
    ).rejects.toMatchObject(insufficientPrivilege);
    await expect(
      appSource.query(
        `SELECT platform_drop_partition('audit_log', $1) AS dropped`,
        [newest],
      ),
    ).resolves.toEqual([{ dropped: true }]);
    await expect(
      appSource.query(
        `SELECT platform_drop_partition('audit_log', 'probes') AS dropped`,
      ),
    ).resolves.toEqual([{ dropped: false }]);
  });

  it('gives the reader role SELECT and nothing else', async () => {
    const admin = server.connection();
    const runner = (
      await connect(admin.username, admin.password)
    ).createQueryRunner();
    await runner.connect();
    try {
      await runner.query(`SET ROLE ${reader}`);
      await runner.query(`SELECT set_config($1, $2, false)`, [
        SessionSetting.TenantId,
        tenantA,
      ]);
      await expect(runner.query('SELECT 1 FROM probes')).resolves.toBeDefined();
      await expect(
        insertProbe(runner.manager, tenantA, 'from-reader'),
      ).rejects.toMatchObject(insufficientPrivilege);
    } finally {
      await runner.query('RESET ROLE');
      await runner.release();
    }
  });
});
