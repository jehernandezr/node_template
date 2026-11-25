import type { DataSource, QueryRunner } from 'typeorm';
import type { TableChecksum } from './table-checksum.js';

/** What a previous call left done of a table's verification. */
export interface TableCheckpoint {
  /** Key of the last reconciled row; the next call continues after it. */
  readonly reconciledKey?: readonly string[];
  /** Count and sum with which the table matched the frozen source; with it the table is not checked again. */
  readonly verified?: TableChecksum;
}

/**
 * The verification progress of a move in `tenant_move_checkpoints` on the target shard. With the source
 * frozen and the target written only by the move, what is verified stays verified, so a table that does not fit
 * in one call's budget finishes over several.
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

  /** Records up to which key the table was reconciled; without a key, reconciliation starts over. */
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
   * Deletes the move's progress on those tables, when it is no longer needed or the copy is discarded. Only those of one
   * manifest: another copy of the same move may have its own progress on the same shard.
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
