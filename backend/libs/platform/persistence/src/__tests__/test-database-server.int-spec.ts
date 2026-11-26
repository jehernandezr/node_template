import { ContainerRuntime } from '@platform/kernel/test-utils';
import { DataSource } from 'typeorm';
import { TestDatabaseServer } from './utils/test-database-server.js';

/** Builds templates by creating one table in each, or fails halfway through, like a migration that breaks. */
class TemplateBuild {
  calls = 0;

  constructor(
    private readonly server: TestDatabaseServer,
    private readonly templates: readonly string[],
  ) {}

  async succeed(): Promise<void> {
    this.calls += 1;
    await this.inTemplate((source) =>
      source.query('CREATE TABLE built (id int PRIMARY KEY)'),
    );
  }

  async failHalfway(): Promise<void> {
    this.calls += 1;
    await this.inTemplate((source) =>
      source.query('CREATE TABLE half_built (id int PRIMARY KEY)'),
    );
    throw new Error('migration failed');
  }

  private async inTemplate(use: (source: DataSource) => Promise<unknown>) {
    const connection = this.server.connection();
    for (const template of this.templates) {
      const source = new DataSource({
        type: 'postgres',
        host: connection.host,
        port: connection.port,
        username: connection.username,
        password: connection.password,
        database: template,
      });
      await source.initialize();
      try {
        await use(source);
      } finally {
        await source.destroy();
      }
    }
  }
}

const runtime = new ContainerRuntime(process.env);

runtime.describeIfAvailable('TestDatabaseServer templates', () => {
  jest.setTimeout(120_000);
  const server = new TestDatabaseServer();
  const key = 'template-build-failure';
  const template = `tpl_${key.replaceAll('-', '_')}`;
  const target = 'clone_of_failed_template';

  const tablesOf = async (database: string): Promise<string[]> => {
    const connection = server.connection();
    const source = new DataSource({
      type: 'postgres',
      host: connection.host,
      port: connection.port,
      username: connection.username,
      password: connection.password,
      database,
    });
    await source.initialize();
    try {
      const rows: { table_name: string }[] = await source.query(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name",
      );
      return rows.map((row) => row.table_name);
    } finally {
      await source.destroy();
    }
  };

  const pairKey = 'template-pair-sibling-missing';
  const pair = ['tpl_pair_first', 'tpl_pair_second'];
  const pairTargets = ['clone_of_pair_first', 'clone_of_pair_second'];

  afterAll(async () => {
    await server.drop([target, template, ...pairTargets, ...pair]);
  });

  it('rebuilds a template whose build failed instead of cloning it half-migrated', async () => {
    const build = new TemplateBuild(server, [template]);

    await expect(
      server.cloneFromTemplates(key, [target], [template], () =>
        build.failHalfway(),
      ),
    ).rejects.toThrow('migration failed');
    await server.cloneFromTemplates(key, [target], [template], () =>
      build.succeed(),
    );

    expect(build.calls).toBe(2);
    await expect(tablesOf(target)).resolves.toEqual(['built']);
  });

  it('clones a finished template without building it again', async () => {
    const build = new TemplateBuild(server, [template]);

    await server.cloneFromTemplates(key, [target], [template], () =>
      build.succeed(),
    );

    expect(build.calls).toBe(0);
    await expect(tablesOf(target)).resolves.toEqual(['built']);
  });

  it('rebuilds every template of a key when one is ready and its sibling is missing', async () => {
    await server.cloneFromTemplates(pairKey, pairTargets, pair, () =>
      new TemplateBuild(server, pair).succeed(),
    );
    await server.drop([pair[1]]);
    const rebuild = new TemplateBuild(server, pair);

    await server.cloneFromTemplates(pairKey, pairTargets, pair, () =>
      rebuild.succeed(),
    );

    expect(rebuild.calls).toBe(1);
    await expect(tablesOf(pairTargets[0])).resolves.toEqual(['built']);
    await expect(tablesOf(pairTargets[1])).resolves.toEqual(['built']);
  });
});
