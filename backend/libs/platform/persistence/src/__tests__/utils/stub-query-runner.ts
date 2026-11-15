import type { IsolationLevel } from 'typeorm/driver/types/IsolationLevel.js';
import type { DataSource, ReplicationMode } from 'typeorm';
import { PostgresQueryRunner } from 'typeorm/driver/postgres/PostgresQueryRunner.js';
import type { PostgresDriver } from 'typeorm/driver/postgres/PostgresDriver.js';

/**
 * `QueryRunner` sin base de datos: registra cada operación en `calls` y no abre conexiones. Sirve para
 * probar las clases que abren transacciones sin PostgreSQL.
 */
export class StubQueryRunner extends PostgresQueryRunner {
  readonly calls: string[] = [];
  /** Respuestas de `query` en orden: cada llamada toma la primera; sin ninguna devuelve un resultado vacío. */
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
