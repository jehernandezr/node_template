import { createHash } from 'node:crypto';
import { SharedTestServers } from '@platform/kernel/test-utils';
import type { SharedPostgres } from '@platform/kernel/test-utils';
import { DataSource } from 'typeorm';
import type { MigrationClass } from '../../model/database-set-definition.js';

/**
 * Databases on the PostgreSQL the Jest run shares. Suites run one at a time on it, so each one drops and creates
 * the databases it uses and drops them again when it ends; migrated templates survive the suite, so the next suite
 * with the same migrations clones them instead of migrating again.
 */
export class TestDatabaseServer {
  private static readonly TEMPLATE_KEY_LENGTH = 12;

  /** Comment a template carries once its build finished, so a half-migrated template is never cloned. */
  static readonly READY_MARK = 'node-template: migrated template';

  constructor(private readonly servers = new SharedTestServers(process.env)) {}

  /**
   * The shared server and its superuser.
   * @returns Where it listens and how the superuser logs in.
   */
  connection(): SharedPostgres {
    return this.servers.postgres();
  }

  /**
   * Password every service role of the run logs in with.
   * @returns The password the `globalSetup` generated.
   */
  rolePassword(): string {
    return this.servers.rolePassword();
  }

  /**
   * A short, stable name for the migrations of a set of databases, so two suites with the same migrations share
   * their templates.
   * @param sets Migrations of each database, in the order they run.
   * @param extras Anything else the template carries, such as the extensions created before migrating.
   * @returns Hex digest of their names and sources.
   */
  static templateKey(
    sets: readonly (readonly MigrationClass[])[],
    extras: readonly string[] = [],
  ): string {
    const hash = createHash('sha256').update(extras.join('\n'));
    for (const migrations of sets) {
      hash.update(`set:${migrations.length}\n`);
      for (const migration of migrations) {
        hash.update(migration.name).update('\n').update(String(migration));
      }
    }
    return hash.digest('hex').slice(0, TestDatabaseServer.TEMPLATE_KEY_LENGTH);
  }

  /**
   * Drops the databases if a previous suite left them and creates them empty.
   * @param names Database names.
   * @param owner Role that owns them; the superuser when absent.
   */
  async recreate(names: readonly string[], owner?: string): Promise<void> {
    await this.asAdmin(async (admin) => {
      for (const name of names) {
        await admin.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
        await admin.query(
          `CREATE DATABASE "${name}"${owner === undefined ? '' : ` OWNER "${owner}"`}`,
        );
      }
    });
  }

  /**
   * Creates the extensions in each database, as database provisioning does in the environments.
   * @param names Database names.
   * @param extensions Extension names.
   */
  async createExtensions(
    names: readonly string[],
    extensions: readonly string[],
  ): Promise<void> {
    for (const name of names) {
      await this.inDatabase(name, async (database) => {
        for (const extension of extensions) {
          await database.query(`CREATE EXTENSION IF NOT EXISTS "${extension}"`);
        }
      });
    }
  }

  /**
   * Drops the databases, closing any connection left open.
   * @param names Database names.
   */
  async drop(names: readonly string[]): Promise<void> {
    await this.asAdmin(async (admin) => {
      for (const name of names) {
        await admin.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
      }
    });
  }

  /**
   * Creates the login role unless an earlier suite of the run did, always with the run's role password.
   * @param role Role name.
   * @param attributes Attributes of `CREATE ROLE`, such as `NOSUPERUSER NOBYPASSRLS`.
   */
  async ensureRole(role: string, attributes = ''): Promise<void> {
    await this.asAdmin(async (admin) => {
      const existing: unknown[] = await admin.query(
        'SELECT 1 FROM pg_roles WHERE rolname = $1',
        [role],
      );
      if (existing.length === 0) {
        await admin.query(
          `CREATE ROLE "${role}" LOGIN ${attributes} PASSWORD '${this.rolePassword()}'`,
        );
      }
    });
  }

  /**
   * Replaces each target with a copy of its template, building the templates first when no earlier suite finished
   * them. A template is marked ready only after its build succeeds and is dropped when the build fails, so one failed
   * migration fails one suite instead of every later clone. A session lock on the key keeps two builders of the same
   * template from racing.
   * @param key Template key, from `templateKey`.
   * @param targets Databases the templates are cloned into.
   * @param templates Template of each target, at the same position.
   * @param build Migrates the template databases, which already exist and are empty, and closes its connections.
   * @param owner Owner of the templates and of the cloned databases; the superuser when absent.
   * @throws The error of `build`, after dropping the templates it left half-built.
   */
  async cloneFromTemplates(
    key: string,
    targets: readonly string[],
    templates: readonly string[],
    build: () => Promise<void>,
    owner?: string,
  ): Promise<void> {
    await this.asAdmin(async (admin) => {
      await admin.query('SELECT pg_advisory_lock(hashtext($1))', [key]);
      try {
        const ready: unknown[] = await admin.query(
          `SELECT datname FROM pg_database WHERE datname = ANY($1) AND shobj_description(oid, 'pg_database') = $2`,
          [templates, TestDatabaseServer.READY_MARK],
        );
        if (ready.length !== templates.length) {
          for (const template of templates) {
            await admin.query(
              `DROP DATABASE IF EXISTS "${template}" WITH (FORCE)`,
            );
            await admin.query(
              `CREATE DATABASE "${template}"${owner === undefined ? '' : ` OWNER "${owner}"`}`,
            );
          }
          try {
            await build();
          } catch (error) {
            for (const template of templates) {
              await admin.query(
                `DROP DATABASE IF EXISTS "${template}" WITH (FORCE)`,
              );
            }
            throw error;
          }
          for (const template of templates) {
            await admin.query(
              `COMMENT ON DATABASE "${template}" IS '${TestDatabaseServer.READY_MARK}'`,
            );
          }
        }
        for (const [index, target] of targets.entries()) {
          await admin.query(`DROP DATABASE IF EXISTS "${target}" WITH (FORCE)`);
          await admin.query(
            `CREATE DATABASE "${target}" TEMPLATE "${templates[index]}"${owner === undefined ? '' : ` OWNER "${owner}"`}`,
          );
        }
      } finally {
        await admin.query('SELECT pg_advisory_unlock(hashtext($1))', [key]);
      }
    });
  }

  private asAdmin<T>(use: (admin: DataSource) => Promise<T>): Promise<T> {
    return this.inDatabase(this.connection().adminDatabase, use);
  }

  private async inDatabase<T>(
    database: string,
    use: (source: DataSource) => Promise<T>,
  ): Promise<T> {
    const connection = this.connection();
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
      return await use(source);
    } finally {
      await source.destroy();
    }
  }
}
