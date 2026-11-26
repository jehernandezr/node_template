import { ContainerRuntime } from '@platform/kernel/test-utils';
import { DataSource } from 'typeorm';
import { TestDatabaseServer } from './utils/test-database-server.js';

/** Builds a template by creating one table in it, or fails halfway through, like a migration that breaks. */
class TemplateBuild {
  calls = 0;

  constructor(
    private readonly server: TestDatabaseServer,
    private readonly template: string,
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
    const source = new DataSource({
      type: 'postgres',
      host: connection.host,
      port: connection.port,
      username: connection.username,
      password: connection.password,
      database: this.template,
    });
    await source.initialize();
    try {
      await use(source);
    } finally {
      await source.destroy();
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

  afterAll(async () => {
    await server.drop([target, template]);
  });

  it('rebuilds a template whose build failed instead of cloning it half-migrated', async () => {
    const build = new TemplateBuild(server, template);

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
    const build = new TemplateBuild(server, template);

    await server.cloneFromTemplates(key, [target], [template], () =>
      build.succeed(),
    );

    expect(build.calls).toBe(0);
    await expect(tablesOf(target)).resolves.toEqual(['built']);
  });
});
