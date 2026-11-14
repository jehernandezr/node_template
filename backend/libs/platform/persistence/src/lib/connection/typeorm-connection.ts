import type { DataSource, QueryRunner } from 'typeorm';
import { DatabaseRole } from '../enums.js';
import type {
  DatabaseConnection,
  LeasedSession,
  SqlResult,
} from '../sql/sql-session.js';

class TypeOrmLeasedSession implements LeasedSession {
  private released = false;

  constructor(private readonly runner: QueryRunner) {}

  async query<Row>(
    sql: string,
    params: readonly unknown[] = [],
  ): Promise<SqlResult<Row>> {
    const result = await this.runner.query(sql, [...params], true);
    const rows = (result.records ?? []) as Row[];
    return { rows, rowCount: result.affected ?? rows.length };
  }

  async release(): Promise<void> {
    if (this.released) {
      return;
    }
    this.released = true;
    await this.runner.release();
  }
}

/**
 * Adaptador de {@link DatabaseConnection} sobre un `DataSource` de TypeORM.
 * La réplica sale de la opción `replication` del `DataSource`: el rol
 * `Replica` pide un `QueryRunner` en modo `slave` y TypeORM usa el primario si
 * no hay réplicas. La capa no usa `synchronize`: el `DataSource` debe tenerlo apagado.
 */
export class TypeOrmConnection implements DatabaseConnection {
  constructor(private readonly dataSource: DataSource) {}

  async acquire(role: DatabaseRole): Promise<LeasedSession> {
    const runner = this.dataSource.createQueryRunner(
      role === DatabaseRole.Replica ? 'slave' : 'master',
    );
    await runner.connect();
    return new TypeOrmLeasedSession(runner);
  }

  async close(): Promise<void> {
    if (this.dataSource.isInitialized) {
      await this.dataSource.destroy();
    }
  }
}
