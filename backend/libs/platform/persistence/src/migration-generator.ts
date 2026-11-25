import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Clock } from '@platform/kernel';
import { DataSource } from 'typeorm';
import { PersistenceError } from './errors/persistence-error.js';
import type { MigrationStatement } from './model/migration-statement.js';
import type { MigrationGenerateRequest } from './model/migration-generate-request.js';
import type { MigrationSourceRenderer } from './migration-source-renderer.js';

/**
 * Generates a TypeORM migration: creates a temporary database, applies the existing migrations to it,
 * compares the schema with the entities and writes `<Name><timestamp>.ts` with `up` and `down`.
 */
export class MigrationGenerator {
  private static readonly NAME_PATTERN = /^[A-Z][A-Za-z0-9]*$/;

  constructor(
    private readonly clock: Clock,
    private readonly renderer: MigrationSourceRenderer,
  ) {}

  /** @returns the path of the written file, or `null` if the entities already match the migrations. */
  async generate(request: MigrationGenerateRequest): Promise<string | null> {
    if (!MigrationGenerator.NAME_PATTERN.test(request.name)) {
      throw PersistenceError.invalidConfiguration(
        'name',
        'PascalCase letters and digits',
      );
    }
    const timestamp = this.clock.now().getTime();
    const tempDb = `migration_tmp_${timestamp}`;
    const className = `${request.name}${timestamp}`;

    await this.adminQuery(request, `CREATE DATABASE "${tempDb}"`);
    const temp = new DataSource({
      type: 'postgres',
      host: request.server.host,
      port: request.server.port,
      username: request.user,
      password: request.password,
      database: tempDb,
      entities: [...request.definition.entities],
      migrations: [...request.definition.migrations],
      synchronize: false,
      migrationsRun: false,
    });
    try {
      await temp.initialize();
      await temp.runMigrations({ transaction: 'each' });
      const diff = await temp.driver.createSchemaBuilder().log();
      if (diff.upQueries.length === 0) {
        return null;
      }
      const source = this.renderer.render(
        className,
        diff.upQueries.map((query) => this.statement(query)),
        [...diff.downQueries].reverse().map((query) => this.statement(query)),
      );
      await mkdir(request.outputDir, { recursive: true });
      const path = join(request.outputDir, `${timestamp}-${request.name}.ts`);
      await writeFile(path, source, 'utf8');
      return path;
    } finally {
      if (temp.isInitialized) {
        await temp.destroy();
      }
      await this.adminQuery(
        request,
        `DROP DATABASE IF EXISTS "${tempDb}" WITH (FORCE)`,
      );
    }
  }

  private adminDataSource(request: MigrationGenerateRequest): DataSource {
    return new DataSource({
      type: 'postgres',
      host: request.server.host,
      port: request.server.port,
      username: request.user,
      password: request.password,
      database: 'postgres',
    });
  }

  /** Runs an administration statement outside any transaction, on the `postgres` database. */
  private async adminQuery(
    request: MigrationGenerateRequest,
    sql: string,
  ): Promise<void> {
    const admin = this.adminDataSource(request);
    await admin.initialize();
    try {
      await admin.query(sql);
    } finally {
      await admin.destroy();
    }
  }

  private statement(query: {
    readonly query: string;
    readonly parameters?: readonly unknown[];
  }): MigrationStatement {
    return { query: query.query, parameters: query.parameters };
  }
}
