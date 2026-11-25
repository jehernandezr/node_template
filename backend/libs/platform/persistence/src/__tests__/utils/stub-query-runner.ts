import type { IsolationLevel } from 'typeorm/driver/types/IsolationLevel.js';
import type { DataSource, ReplicationMode } from 'typeorm';
import { PostgresQueryRunner } from 'typeorm/driver/postgres/PostgresQueryRunner.js';
import type { PostgresDriver } from 'typeorm/driver/postgres/PostgresDriver.js';

/**
 * `QueryRunner` without a database: records each operation in `calls` and opens no connections. Used to
 * test the classes that open transactions without PostgreSQL.
 */
export class StubQueryRunner extends PostgresQueryRunner {
  readonly calls: string[] = [];
  /** Responses of `query` in order: each call takes the first one; with none left it returns an empty result. */
  readonly responses: unknown[] = [];
  failOnCommit = false;

  constructor(dataSource: DataSource, mode: ReplicationMode = 'master') {
    super(dataSource.driver as PostgresDriver, mode);
    Object.defineProperty(this, 'connection', { value: dataSource });
    Object.defineProperty(this, 'manager', {
      value: dataSource.createEntityManager(this),
    });
  }

  override connect(): Promise<never> {
    this.calls.push('connect');
    return Promise.resolve(undefined as never);
  }

  override startTransaction(isolation?: IsolationLevel): Promise<void> {
    this.calls.push(`begin${isolation === undefined ? '' : ` ${isolation}`}`);
    return Promise.resolve();
  }

  override commitTransaction(): Promise<void> {
    this.calls.push('commit');
    return this.failOnCommit
      ? Promise.reject(new Error('commit failed'))
      : Promise.resolve();
  }

  override rollbackTransaction(): Promise<void> {
    this.calls.push('rollback');
    return Promise.resolve();
  }

  override release(): Promise<void> {
    this.calls.push('release');
    return Promise.resolve();
  }

  override query(
    sql: string,
    parameters?: unknown[],
    useStructuredResult?: boolean,
  ): Promise<never> {
    this.calls.push(`query ${sql} ${JSON.stringify(parameters ?? [])}`);
    const empty =
      useStructuredResult === true ? { records: [], raw: [], affected: 0 } : [];
    return Promise.resolve((this.responses.shift() ?? empty) as never);
  }
}
