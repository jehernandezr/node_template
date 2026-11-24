import type { DataSource, QueryRunner } from 'typeorm';
import type { TableChecksum } from './table-checksum.js';

/** Lo que una llamada anterior dejó hecho de la verificación de una tabla. */
export interface TableCheckpoint {
  /** Llave de la última fila reconciliada; la siguiente llamada sigue después de ella. */
  readonly reconciledKey?: readonly string[];
  /** Conteo y suma con que la tabla quedó igual al origen congelado; con ella la tabla ya no se vuelve a mirar. */
  readonly verified?: TableChecksum;
}

/**
 * El avance de la verificación de un traslado en `tenant_move_checkpoints` del shard de destino. Con el origen
 * congelado y el destino escrito solo por el traslado, lo verificado sigue verificado, así que una tabla que no cabe
 * en el plazo de una llamada termina en varias.
 */
export class TransferCheckpoints {
  async read(
    runner: QueryRunner,
    moveId: string,
    table: string,
  ): Promise<TableCheckpoint> {
    const rows: {
      reconciled_key: string[] | null;
      verified_rows: number | null;
      verified_checksum: string | null;
    }[] = await runner.query(
      'SELECT reconciled_key, verified_rows, verified_checksum FROM tenant_move_checkpoints WHERE move_id = $1 AND table_name = $2',
      [moveId, table],
    );
    const [row] = rows;
    if (row === undefined) {
      return {};
    }
    return {
      ...(row.reconciled_key !== null && { reconciledKey: row.reconciled_key }),
      ...(row.verified_rows !== null &&
        row.verified_checksum !== null && {
          verified: {
            rows: row.verified_rows,
            checksum: row.verified_checksum,
          },
        }),
    };
  }

  /** Anota hasta qué llave quedó reconciliada la tabla; sin llave, la reconciliación vuelve a empezar. */
  async reconciledUpTo(
    runner: QueryRunner,
    moveId: string,
    table: string,
    key: readonly string[] | undefined,
  ): Promise<void> {
    await runner.query(
      `INSERT INTO tenant_move_checkpoints (move_id, table_name, reconciled_key, updated_at) VALUES ($1, $2, $3::jsonb, now())
         ON CONFLICT (move_id, table_name) DO UPDATE SET reconciled_key = EXCLUDED.reconciled_key, updated_at = now()`,
      [moveId, table, key === undefined ? null : JSON.stringify(key)],
    );
  }

  async verified(
    runner: QueryRunner,
    moveId: string,
    table: string,
    checksum: TableChecksum,
  ): Promise<void> {
    await runner.query(
      `INSERT INTO tenant_move_checkpoints (move_id, table_name, verified_rows, verified_checksum, updated_at) VALUES ($1, $2, $3, $4, now())
         ON CONFLICT (move_id, table_name) DO UPDATE SET verified_rows = EXCLUDED.verified_rows,
           verified_checksum = EXCLUDED.verified_checksum, updated_at = now()`,
      [moveId, table, checksum.rows, checksum.checksum],
    );
  }

  /**
   * Borra el avance del traslado en esas tablas, cuando ya no hace falta o la copia se descarta. Solo las de un
   * manifiesto: otra copia del mismo traslado puede tener avance propio en el mismo shard.
   */
  async forget(
    dataSource: DataSource,
    moveId: string,
    tables: readonly string[],
  ): Promise<void> {
    await dataSource.query(
      'DELETE FROM tenant_move_checkpoints WHERE move_id = $1 AND table_name = ANY($2::text[])',
      [moveId, [...tables]],
    );
  }
}
