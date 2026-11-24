import { ShardingError, ShardingErrorCode } from '@platform/sharding';
import type { DataSource, EntityManager, QueryRunner } from 'typeorm';

/**
 * Barrera de escritura de un tenant dentro de su shard, la que garantiza que ninguna escritura llegue al origen
 * después de la última ronda de un traslado. Cada transacción de escritura toma un candado consultivo compartido
 * por tenant antes de abrirse y mira si el tenant tiene fila en `tenant_write_fences`; el traslado escribe esa fila
 * y luego toma el candado exclusivo, que espera a que terminen las transacciones que ya entraron.
 *
 * El candado es de sesión y se toma antes de `BEGIN`, y la revisión corre fuera de la transacción: así la revisión
 * siempre ve una fila escrita antes de que el candado se concediera, con cualquier nivel de aislamiento.
 *
 * Los mantenimientos que recorren todos los tenants de un shard toman otro candado compartido, uno solo por shard,
 * que el traslado también espera: un mantenimiento no corre en un shard con un traslado sin pivotar, y deja fuera las
 * filas de los tenants que ya se fueron.
 */
export class TenantWriteFence {
  /** Espacio de los candados consultivos por tenant, para no chocar con otros candados de dos enteros. */
  private static readonly LOCK_SPACE = 0x5446;
  private static readonly LOCK_KEY = `${TenantWriteFence.LOCK_SPACE}, hashtext($1)`;
  private static readonly MAINTENANCE_LOCK_KEY = `${TenantWriteFence.LOCK_SPACE + 1}, 0`;
  private static readonly RETRY_AFTER_SECONDS = 1;

  /**
   * Condición SQL que deja fuera las filas de los tenants con barrera en este shard, para los mantenimientos.
   * @param tenantExpression expresión SQL con el id del tenant de la fila, calificada con su tabla o alias (por
   *   ejemplo `"tasks"."tenant_id"`): sin calificar, `tenant_id` sería la columna de la barrera.
   */
  static unfenced(tenantExpression: string): string {
    return `NOT EXISTS (SELECT 1 FROM tenant_write_fences twf WHERE twf.tenant_id = (${tenantExpression})::text)`;
  }

  /**
   * Toma el candado compartido del tenant en la sesión y comprueba que el tenant no tenga barrera.
   * @throws ShardingError `TenantMigrating` si la tiene; en ese caso ya soltó el candado.
   */
  async admit(runner: QueryRunner, tenantId: string): Promise<void> {
    await runner.query(
      `SELECT pg_advisory_lock_shared(${TenantWriteFence.LOCK_KEY})`,
      [tenantId],
    );
    let fenced: boolean;
    try {
      fenced = await this.isRaised(runner, tenantId);
    } catch (error) {
      await this.leave(runner, tenantId);
      throw error;
    }
    if (fenced) {
      await this.leave(runner, tenantId);
      throw TenantWriteFence.migrating({ tenantId });
    }
  }

  /** Suelta el candado compartido que tomó `admit` en la misma sesión. */
  async leave(runner: QueryRunner, tenantId: string): Promise<void> {
    await runner.query(
      `SELECT pg_advisory_unlock_shared(${TenantWriteFence.LOCK_KEY})`,
      [tenantId],
    );
  }

  /**
   * Dentro de la transacción de un mantenimiento: toma el candado de mantenimiento del shard hasta el final de la
   * transacción y comprueba que ningún traslado esté a medio camino en él.
   * @throws ShardingError `TenantMigrating` si algún tenant tiene barrera sin pivotar; el mantenimiento se repite en
   *   la corrida siguiente.
   */
  async enterMaintenance(manager: EntityManager): Promise<void> {
    await manager.query(
      `SELECT pg_advisory_xact_lock_shared(${TenantWriteFence.MAINTENANCE_LOCK_KEY})`,
    );
    const rows: { tenant_id: string }[] = await manager.query(
      'SELECT tenant_id FROM tenant_write_fences WHERE switched_at IS NULL LIMIT 1',
    );
    const [moving] = rows;
    if (moving !== undefined) {
      throw TenantWriteFence.migrating({ tenantId: moving.tenant_id });
    }
  }

  /**
   * Levanta la barrera del tenant para el traslado y espera a que terminen las transacciones de escritura y los
   * mantenimientos que ya habían entrado. Al volver, ninguna escritura del tenant puede llegar a este shard.
   * Idempotente; si el tenant tenía la barrera de un traslado anterior, pasa a ser la de este.
   */
  async raise(
    dataSource: DataSource,
    tenantId: string,
    moveId: string,
  ): Promise<void> {
    const runner = dataSource.createQueryRunner('master');
    try {
      await runner.query(
        `INSERT INTO tenant_write_fences (tenant_id, move_id, created_at, switched_at) VALUES ($1, $2, now(), NULL)
           ON CONFLICT (tenant_id) DO UPDATE SET move_id = EXCLUDED.move_id, created_at = EXCLUDED.created_at, switched_at = NULL
           WHERE tenant_write_fences.move_id <> EXCLUDED.move_id`,
        [tenantId, moveId],
      );
      await TenantWriteFence.waitFor(runner, TenantWriteFence.LOCK_KEY, [
        tenantId,
      ]);
      await TenantWriteFence.waitFor(
        runner,
        TenantWriteFence.MAINTENANCE_LOCK_KEY,
        [],
      );
    } finally {
      await runner.release();
    }
  }

  /** Anota que el traslado ya pivotó: el tenant vive en otro shard y sus filas de aquí solo esperan la limpieza. */
  async markSwitched(
    dataSource: DataSource,
    tenantId: string,
    moveId: string,
  ): Promise<void> {
    await dataSource.query(
      'UPDATE tenant_write_fences SET switched_at = now() WHERE tenant_id = $1 AND move_id = $2 AND switched_at IS NULL',
      [tenantId, moveId],
    );
  }

  /** El traslado que levantó la barrera del tenant en este shard, o `undefined` si no hay barrera. */
  async raisedBy(
    dataSource: DataSource,
    tenantId: string,
  ): Promise<string | undefined> {
    const rows: { move_id: string }[] = await dataSource.query(
      'SELECT move_id FROM tenant_write_fences WHERE tenant_id = $1',
      [tenantId],
    );
    return rows[0]?.move_id;
  }

  /** Baja la barrera que levantó ese traslado, por ejemplo al cancelarlo o al limpiar el origen. Idempotente. */
  async lower(
    dataSource: DataSource,
    tenantId: string,
    moveId: string,
  ): Promise<void> {
    await dataSource.query(
      'DELETE FROM tenant_write_fences WHERE tenant_id = $1 AND move_id = $2',
      [tenantId, moveId],
    );
  }

  /** Baja cualquier barrera del tenant, la de un traslado anterior que lo sacó de este shard al que ahora vuelve. */
  async lowerAny(dataSource: DataSource, tenantId: string): Promise<void> {
    await dataSource.query(
      'DELETE FROM tenant_write_fences WHERE tenant_id = $1',
      [tenantId],
    );
  }

  private async isRaised(
    runner: QueryRunner,
    tenantId: string,
  ): Promise<boolean> {
    const rows: { fenced: boolean }[] = await runner.query(
      'SELECT EXISTS (SELECT 1 FROM tenant_write_fences WHERE tenant_id = $1) AS fenced',
      [tenantId],
    );
    return rows[0]?.fenced === true;
  }

  /** Toma el candado exclusivo y lo suelta: vuelve cuando ya no queda nadie con el compartido. */
  private static async waitFor(
    runner: QueryRunner,
    key: string,
    params: readonly string[],
  ): Promise<void> {
    await runner.query(`SELECT pg_advisory_lock(${key})`, [...params]);
    await runner.query(`SELECT pg_advisory_unlock(${key})`, [...params]);
  }

  private static migrating(details: { tenantId: string }): ShardingError {
    return new ShardingError(
      ShardingErrorCode.TenantMigrating,
      'Tenant is migrating; its writes moved to another shard',
      {
        details: {
          ...details,
          retryAfterSeconds: TenantWriteFence.RETRY_AFTER_SECONDS,
        },
      },
    );
  }
}
