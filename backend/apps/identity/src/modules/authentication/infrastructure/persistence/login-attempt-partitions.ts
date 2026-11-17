import type { EntityManager } from 'typeorm';

/**
 * Mantenimiento de las particiones mensuales de `login_attempts` en un shard: crea las de los meses que
 * vienen y borra las que pasaron la retención. Usa las funciones de `@platform/persistence`
 * (`platform_ensure_partitions`) y el nombre `<tabla>_<AAAAMM>` que ellas le dan a cada partición.
 */
export class LoginAttemptPartitions {
  static readonly TABLE = 'login_attempts';
  static readonly RETENTION_MONTHS = 12;
  /** Meses por delante que siempre existen: el job puede fallar unas semanas sin que falte una partición. */
  static readonly MONTHS_AHEAD = 3;
  private static readonly MONTHLY = /^login_attempts_(\d{4})(\d{2})$/;

  /** Crea las particiones que faltan y borra las vencidas; devuelve los nombres de las borradas. */
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
      await manager.query(`DROP TABLE IF EXISTS "${name}"`);
    }
    return expired;
  }

  /** Una partición vence cuando todo su mes quedó antes del corte de retención. */
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
