import type { DataSource, QueryRunner } from 'typeorm';

/**
 * Short transaction on a shard with the tenant in the session, to pass the RLS of its tables. Releases the connection
 * on every path.
 */
export class TenantSession {
  private static readonly TENANT_SETTING = 'app.tenant_id';

  async run<T>(
    dataSource: DataSource,
    tenantId: string,
    fn: (runner: QueryRunner) => Promise<T>,
  ): Promise<T> {
    const runner = dataSource.createQueryRunner('master');
    try {
      await runner.connect();
      await runner.startTransaction();
      try {
        await runner.query('SELECT set_config($1, $2, true)', [
          TenantSession.TENANT_SETTING,
          tenantId,
        ]);
        const result = await fn(runner);
        await runner.commitTransaction();
        return result;
      } catch (error) {
        await runner.rollbackTransaction();
        throw error;
      }
    } finally {
      await runner.release();
    }
  }
}
