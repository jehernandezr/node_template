import type {
  TenantMoveProgress,
  TenantMoveVerification,
} from '@contracts/platform';
import type { Clock } from '@platform/kernel';
import { TimerScheduler } from '@platform/primitives';
import { QueryFailedError, type DataSource, type EntityManager } from 'typeorm';
import { TenantMoveErrorCode } from '../../errors/tenant-move-error-code.enum.js';
import { TenantMoveError } from '../../errors/tenant-move.error.js';
import { TenantMoveSelectorKind } from '../../manifest/tenant-move-selector-kind.enum.js';
import type { TenantMoveManifest } from '../../manifest/tenant-move-manifest.js';
import { SqlIdentifier } from '../batch/sql-identifier.js';
import { TenantDataTransfer } from '../tenant-data-transfer.js';
import type { TenantTransfer } from '../tenant-transfer.js';
import { TransferBudget } from '../transfer-budget.js';
import type { LogicalReplicationOptions } from './logical-replication-options.js';
import { ReplicationNames } from './replication-names.js';

/** Los datos de conexión de un `DataSource` de Postgres, con o sin réplicas. */
interface ConnectionFields {
  readonly host?: string;
  readonly port?: number;
  readonly username?: string;
  readonly password?: string;
  readonly database?: string;
}

interface ReplicatedTable {
  readonly table: string;
  readonly column: string;
}

/**
 * Copia con la replicación lógica de PostgreSQL: una publicación en el origen con el filtro de filas del tenant y una
 * suscripción en el destino que hace la copia inicial y sigue los cambios, también los borrados. Pide
 * `wal_level=logical` en el origen, un rol con `REPLICATION` y permiso de crear suscripciones en el destino, y red
 * del destino al origen. La suscripción aplica los cambios con el rol que la crea (`run_as_owner`), que debe saltarse
 * el RLS: Postgres no replica hacia tablas con RLS cuando el rol que aplica está sujeto a él.
 *
 * El filtro de una publicación no admite subconsultas, así que solo sirve a manifiestos cuyas tablas tienen columna del
 * tenant (`supports`). Mientras alguna publicación incluya una tabla, la tabla queda con `REPLICA IDENTITY FULL`, que
 * el filtro exige para replicar cambios y borrados; la identidad vuelve a la normal cuando la última publicación que
 * la incluye se retira. Crear y retirar publicaciones toma un candado del shard, para que dos traslados a la vez no
 * dejen una tabla publicada sin la identidad que su filtro necesita. Cambiar la identidad toma un candado exclusivo
 * de la tabla, que se espera solo hasta `lockTimeoutMs`, y mientras dure la publicación cada cambio de la tabla
 * escribe la fila vieja completa en el WAL. La verificación final y la reconciliación son
 * las de la copia por lotes.
 */
export class LogicalReplicationTransfer extends TenantDataTransfer {
  private static readonly POLL_MS = 100;
  /** Espacio propio del candado consultivo de las publicaciones, para no chocar con otros candados de dos enteros. */
  private static readonly PUBLICATIONS_LOCK_SPACE = 0x544d;
  private static readonly PUBLICATIONS_LOCK = `SELECT pg_advisory_xact_lock(${LogicalReplicationTransfer.PUBLICATIONS_LOCK_SPACE}, 0)`;
  /** SQLSTATE de `lock_timeout` agotado. */
  private static readonly LOCK_NOT_AVAILABLE = '55P03';
  private readonly tables: readonly ReplicatedTable[];

  /** Si el manifiesto se puede copiar con replicación lógica: todas sus tablas tienen columna del tenant. */
  static supports(manifest: TenantMoveManifest): boolean {
    return manifest
      .tables()
      .every(
        (entry) => entry.selector.kind === TenantMoveSelectorKind.TenantColumn,
      );
  }

  /** @throws TenantMoveError `InvalidManifest` si alguna tabla llega al tenant por su padre. */
  constructor(
    manifest: TenantMoveManifest,
    private readonly batch: TenantDataTransfer,
    private readonly clock: Clock,
    private readonly options: LogicalReplicationOptions,
  ) {
    super();
    this.tables = manifest.tables().map((entry) => {
      const selector = entry.selector;
      if (selector.kind !== TenantMoveSelectorKind.TenantColumn) {
        throw new TenantMoveError(
          TenantMoveErrorCode.InvalidManifest,
          'Logical replication only moves tables with a tenant column',
          { table: entry.table },
        );
      }
      return { table: entry.table, column: selector.column };
    });
  }

  async sync(transfer: TenantTransfer): Promise<TenantMoveProgress> {
    const name = ReplicationNames.of(transfer.moveId);
    await this.publish(transfer.source, transfer.tenantId, name);
    await this.subscribe(transfer.target, transfer.source, name);
    const ready = await this.initialCopyDone(transfer.target, name);
    const pending = await this.pendingBytes(transfer.source, name);
    return {
      tables: this.tables.map(({ table }) => ({
        table,
        copiedRows: 0,
        pendingRows: 0,
      })),
      caughtUp: ready && pending <= this.options.caughtUpBytes,
    };
  }

  /** Espera a que la suscripción reciba todo el WAL del origen congelado, la retira y verifica como la copia por lotes. */
  async verify(transfer: TenantTransfer): Promise<TenantMoveVerification> {
    const name = ReplicationNames.of(transfer.moveId);
    const budget = transfer.budget ?? this.newBudget();
    if (await this.isSubscribed(transfer.target, name)) {
      const goal = await this.currentLsn(transfer.source);
      while (!(await this.reached(transfer.source, name, goal))) {
        budget.check(name);
        await LogicalReplicationTransfer.pause();
      }
    }
    await this.unsubscribe(transfer.target, transfer.source, name, budget);
    return this.batch.verify({ ...transfer, budget });
  }

  async abort(transfer: TenantTransfer): Promise<void> {
    const budget = transfer.budget ?? this.newBudget();
    await this.unsubscribe(
      transfer.target,
      transfer.source,
      ReplicationNames.of(transfer.moveId),
      budget,
    );
    await this.batch.abort({ ...transfer, budget });
  }

  async cleanup(
    tenantId: string,
    source: DataSource,
    budget?: TransferBudget,
  ): Promise<void> {
    await this.batch.cleanup(tenantId, source, budget);
  }

  async assignRegion(
    tenantId: string,
    target: DataSource,
    region: string,
  ): Promise<void> {
    await this.batch.assignRegion(tenantId, target, region);
  }

  private async publish(
    source: DataSource,
    tenantId: string,
    name: string,
  ): Promise<void> {
    const literal = await this.literal(source, tenantId);
    await this.inPublicationsLock(source, async (manager) => {
      const exists: unknown[] = await manager.query(
        'SELECT 1 FROM pg_publication WHERE pubname = $1',
        [name],
      );
      if (exists.length > 0) {
        return;
      }
      await this.limitLockWait(manager);
      for (const { table } of this.tables) {
        await manager.query(
          `ALTER TABLE ${SqlIdentifier.quoteTable(table)} REPLICA IDENTITY FULL`,
        );
      }
      const tables = this.tables
        .map(
          ({ table, column }) =>
            `${SqlIdentifier.quoteTable(table)} WHERE (${SqlIdentifier.quote(column)} = ${literal})`,
        )
        .join(', ');
      await manager.query(`CREATE PUBLICATION ${name} FOR TABLE ${tables}`);
    });
    const slot: unknown[] = await source.query(
      'SELECT 1 FROM pg_replication_slots WHERE slot_name = $1',
      [name],
    );
    if (slot.length === 0) {
      await source.query(
        "SELECT pg_create_logical_replication_slot($1, 'pgoutput')",
        [name],
      );
    }
  }

  /** El slot se crea aparte: crearlo desde la suscripción se bloquea cuando origen y destino comparten servidor. */
  private async subscribe(
    target: DataSource,
    source: DataSource,
    name: string,
  ): Promise<void> {
    if (await this.isSubscribed(target, name)) {
      return;
    }
    const connection = await this.literal(target, this.connectionOf(source));
    await target.query(
      `CREATE SUBSCRIPTION ${name} CONNECTION ${connection} PUBLICATION ${name} ` +
        `WITH (create_slot = false, slot_name = '${name}', copy_data = true, run_as_owner = true)`,
    );
  }

  /**
   * Retira suscripción, slot y publicación, y devuelve a su identidad de réplica normal las tablas que ya no están en
   * ninguna publicación. Idempotente.
   */
  private async unsubscribe(
    target: DataSource,
    source: DataSource,
    name: string,
    budget: TransferBudget,
  ): Promise<void> {
    if (await this.isSubscribed(target, name)) {
      await target.query(`ALTER SUBSCRIPTION ${name} DISABLE`);
      await target.query(`ALTER SUBSCRIPTION ${name} SET (slot_name = NONE)`);
      await target.query(`DROP SUBSCRIPTION ${name}`);
    }
    await this.dropSlot(source, name, budget);
    await this.inPublicationsLock(source, async (manager) => {
      await manager.query(`DROP PUBLICATION IF EXISTS ${name}`);
      await this.limitLockWait(manager);
      for (const { table } of this.tables) {
        const published: unknown[] = await manager.query(
          'SELECT 1 FROM pg_publication_tables WHERE schemaname = current_schema() AND tablename = $1 LIMIT 1',
          [table],
        );
        if (published.length === 0) {
          await manager.query(
            `ALTER TABLE ${SqlIdentifier.quoteTable(table)} REPLICA IDENTITY DEFAULT`,
          );
        }
      }
    });
  }

  /**
   * Borra el slot cuando ya nadie lo usa: el proceso que enviaba los cambios a la suscripción tarda un momento en
   * terminar después de que la suscripción se retira.
   * @throws TenantMoveError `RoundPending` si sigue en uso al acabarse el plazo de la llamada.
   */
  private async dropSlot(
    source: DataSource,
    name: string,
    budget: TransferBudget,
  ): Promise<void> {
    for (;;) {
      const slots: { active: boolean }[] = await source.query(
        'SELECT active FROM pg_replication_slots WHERE slot_name = $1',
        [name],
      );
      const [slot] = slots;
      if (slot === undefined) {
        return;
      }
      if (!slot.active) {
        await source.query('SELECT pg_drop_replication_slot($1)', [name]);
        return;
      }
      budget.check(name);
      await LogicalReplicationTransfer.pause();
    }
  }

  /**
   * Una transacción con el candado de las publicaciones del shard. Si el candado de una tabla no llega en
   * `lockTimeoutMs`, la ronda se repite en la llamada siguiente.
   * @throws TenantMoveError `RoundPending` si se agotó la espera por un candado.
   */
  private async inPublicationsLock(
    source: DataSource,
    work: (manager: EntityManager) => Promise<void>,
  ): Promise<void> {
    try {
      await source.transaction(async (manager) => {
        await manager.query(LogicalReplicationTransfer.PUBLICATIONS_LOCK);
        await work(manager);
      });
    } catch (error) {
      if (LogicalReplicationTransfer.isLockTimeout(error)) {
        throw new TenantMoveError(
          TenantMoveErrorCode.RoundPending,
          'A table lock for the publication did not arrive in time',
        );
      }
      throw error;
    }
  }

  /**
   * `REPLICA IDENTITY` toma un candado exclusivo de la tabla: sin límite, esperaría detrás de una transacción larga y
   * dejaría en cola a todas las escrituras que llegan después.
   */
  private async limitLockWait(manager: EntityManager): Promise<void> {
    await manager.query("SELECT set_config('lock_timeout', $1, true)", [
      `${this.options.lockTimeoutMs}ms`,
    ]);
  }

  private static isLockTimeout(error: unknown): boolean {
    const cause =
      error instanceof QueryFailedError
        ? (error.driverError as { code?: unknown })
        : undefined;
    return cause?.code === LogicalReplicationTransfer.LOCK_NOT_AVAILABLE;
  }

  private async isSubscribed(
    target: DataSource,
    name: string,
  ): Promise<boolean> {
    const rows: unknown[] = await target.query(
      // pg_subscription es un catálogo de todo el servidor: sin el filtro vería suscripciones de otras bases.
      `SELECT 1 FROM pg_subscription
        WHERE subname = $1 AND subdbid = (SELECT oid FROM pg_database WHERE datname = current_database())`,
      [name],
    );
    return rows.length > 0;
  }

  /** La copia inicial de la suscripción terminó en todas sus tablas. */
  private async initialCopyDone(
    target: DataSource,
    name: string,
  ): Promise<boolean> {
    const rows: { total: string; ready: string }[] = await target.query(
      `SELECT count(*)::text AS total, count(*) FILTER (WHERE r.srsubstate = 'r')::text AS ready
         FROM pg_subscription s JOIN pg_subscription_rel r ON r.srsubid = s.oid
        WHERE s.subname = $1`,
      [name],
    );
    const [row] = rows;
    return (
      row !== undefined &&
      Number(row.total) === this.tables.length &&
      row.total === row.ready
    );
  }

  private async pendingBytes(
    source: DataSource,
    name: string,
  ): Promise<number> {
    const rows: { pending: string | null }[] = await source.query(
      `SELECT pg_wal_lsn_diff(pg_current_wal_lsn(), confirmed_flush_lsn)::text AS pending
         FROM pg_replication_slots WHERE slot_name = $1`,
      [name],
    );
    return Number(rows[0]?.pending ?? Number.POSITIVE_INFINITY);
  }

  private async currentLsn(source: DataSource): Promise<string> {
    const rows: { lsn: string }[] = await source.query(
      'SELECT pg_current_wal_lsn()::text AS lsn',
    );
    return rows[0]?.lsn ?? '0/0';
  }

  private async reached(
    source: DataSource,
    name: string,
    goal: string,
  ): Promise<boolean> {
    const rows: { reached: boolean }[] = await source.query(
      'SELECT confirmed_flush_lsn >= $2::pg_lsn AS reached FROM pg_replication_slots WHERE slot_name = $1',
      [name, goal],
    );
    return rows[0]?.reached === true;
  }

  /** Cadena de conexión al origen tal como la ve el servidor de destino. */
  private connectionOf(source: DataSource): string {
    const options = source.options as ConnectionFields & {
      readonly replication?: { readonly master: ConnectionFields };
    };
    const master = options.replication?.master ?? options;
    const parts: readonly (readonly [string, string | number | undefined])[] = [
      ['host', this.options.sourceHost ?? master.host],
      ['port', this.options.sourcePort ?? master.port],
      ['dbname', master.database],
      ['user', master.username],
      ['password', master.password],
    ];
    return parts
      .filter(([, value]) => value !== undefined)
      .map(
        ([key, value]) => `${key}='${String(value).replace(/['\\]/g, '\\$&')}'`,
      )
      .join(' ');
  }

  /** Un texto como literal SQL con las comillas que pone el propio servidor, para las sentencias sin parámetros. */
  private async literal(
    dataSource: DataSource,
    value: string,
  ): Promise<string> {
    const rows: { literal: string }[] = await dataSource.query(
      'SELECT quote_literal($1::text) AS literal',
      [value],
    );
    return rows[0]?.literal ?? "''";
  }

  private newBudget(): TransferBudget {
    return new TransferBudget(this.clock, this.options.callBudgetMs);
  }

  private static pause(): Promise<void> {
    return new Promise((resolve) => {
      TimerScheduler.arm(LogicalReplicationTransfer.POLL_MS, resolve);
    });
  }
}
