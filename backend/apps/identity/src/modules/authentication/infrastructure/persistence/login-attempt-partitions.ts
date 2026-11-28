import type { EntityManager } from 'typeorm';

/**
 * Maintenance of the monthly `login_attempts` partitions on a shard: creates those for the upcoming
 * months and drops those past retention. Uses the `@platform/persistence` functions
 * (`platform_ensure_partitions` and `platform_drop_partition`, which run as the table owner because the service
 * role cannot change the schema) and the `<table>_<YYYYMM>` name they give each partition.
 */
export class LoginAttemptPartitions {
  static readonly TABLE = 'login_attempts';
  static readonly RETENTION_MONTHS = 12;
  /** Months ahead that always exist: the job can fail for a few weeks without a partition missing. */
  static readonly MONTHS_AHEAD = 3;
  private static readonly MONTHLY = /^login_attempts_(\d{4})(\d{2})$/;

  /**
   * Creates the missing partitions and drops the expired ones; returns the names of the dropped ones.
   * @param manager Entity manager of the shard.
   * @param now Current instant.
   * @returns The dropped partitions.
   */
  async maintain(manager: EntityManager, now: Date): Promise<string[]> {
    await manager.query(`SELECT platform_ensure_partitions($1, 'month', $2)`, [
      LoginAttemptPartitions.TABLE,
      LoginAttemptPartitions.MONTHS_AHEAD,
    ]);
    const rows: Array<{ name: string }> = await manager.query(
      `SELECT c.relname AS name FROM pg_inherits i JOIN pg_class c ON c.oid = i.inhrelid JOIN pg_class p ON p.oid = i.inhparent WHERE p.relname = $1`,
      [LoginAttemptPartitions.TABLE],
    );
    const expired = rows
      .map((row) => row.name)
      .filter((name) => this.isExpired(name, now));
    for (const name of expired) {
      await manager.query('SELECT platform_drop_partition($1, $2)', [
        LoginAttemptPartitions.TABLE,
        name,
      ]);
    }
    return expired;
  }

  /**
   * A partition expires when its whole month falls before the retention cutoff.
   * @param name Partition name.
   * @param now Current instant.
   * @returns `true` when expired.
   */
  isExpired(name: string, now: Date): boolean {
    const match = LoginAttemptPartitions.MONTHLY.exec(name);
    if (match === null) {
      return false;
    }
    const monthEnd = Date.UTC(Number(match[1]), Number(match[2]), 1);
    const cutoff = Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth() - LoginAttemptPartitions.RETENTION_MONTHS,
      1,
    );
    return monthEnd <= cutoff;
  }
}
