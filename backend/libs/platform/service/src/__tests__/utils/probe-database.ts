import { DataSource } from 'typeorm';
import type { PostgresConnection } from './postgres-connection.js';

/** Test connection to a database in the container. Opens and closes its `DataSource` on each query. */
export class ProbeDatabase {
  constructor(
    private readonly connection: PostgresConnection,
    readonly database: string,
  ) {}

  async query(sql: string): Promise<void> {
    await this.withSource(async (source) => {
      await source.query(sql);
    });
  }

  async rows<T>(sql: string): Promise<readonly T[]> {
    return this.withSource<readonly T[]>(async (source) => {
      const result: T[] = await source.query(sql);
      return result;
    });
  }

  private async withSource<T>(
    use: (source: DataSource) => Promise<T>,
  ): Promise<T> {
    const source = new DataSource({
      type: 'postgres',
      host: this.connection.host,
      port: this.connection.port,
      username: this.connection.username,
      password: this.connection.password,
      database: this.database,
    });
    await source.initialize();
    try {
      return await use(source);
    } finally {
      await source.destroy();
    }
  }
}
