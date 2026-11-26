import type { DataSource, QueryRunner } from 'typeorm';
import type { TableChecksum } from './table-checksum.js';

/** What a previous call left done of a table's verification. */
export interface TableCheckpoint {
  /** Key of the last reconciled row; the next call continues after it. */
  readonly reconciledKey?: readonly string[];
  /** Key of the last target row checked while pruning; the next call continues after it. */
  readonly prunedKey?: readonly string[];
  /** Whether every target row the source no longer has was already deleted. */
  readonly pruned?: boolean;
  /** Count and sum with which the table matched the frozen source; with it the table is not checked again. */
  readonly verified?: TableChecksum;
}

/**
 * The verification progress of a move in `tenant_move_checkpoints` on the target shard. With the source
 * frozen and the target written only by the move, what is verified stays verified, so a table that does not fit
 * in one call's budget finishes over several.
 */
export class TransferCheckpoints {
  /**
   * Reads what a previous call left done of a table's verification.
   * @param runner Connection of the target.
   * @param moveId Move.
   * @param table Table to read.
   * @returns The checkpoint.
   */
  async read(
    runner: QueryRunner,
    moveId: string,
    table: string,
  ): Promise<TableCheckpoint> {
    const rows: {
      reconciled_key: string[] | null;
      pruned_key: string[] | null;
      pruned: boolean;
      verified_rows: number | null;
      verified_checksum: string | null;
    }[] = await runner.query(
      'SELECT reconciled_key, pruned_key, pruned, verified_rows, verified_checksum FROM tenant_move_checkpoints WHERE move_id = $1 AND table_name = $2',
      [moveId, table],
    );
    const [row] = rows;
    if (row === undefined) {
      return {};
    }
    return {
      ...(row.reconciled_key !== null && { reconciledKey: row.reconciled_key }),
      ...(row.pruned_key !== null && { prunedKey: row.pruned_key }),
      ...(row.pruned && { pruned: true }),
      ...(row.verified_rows !== null &&
        row.verified_checksum !== null && {
          verified: {
            rows: row.verified_rows,
            checksum: row.verified_checksum,
          },
        }),
    };
  }

  /**
   * Records up to which key the table was reconciled; without a key, reconciliation starts over.
   * @param runner Connection of the target.
   * @param moveId Move.
   * @param table Table reconciled.
   * @param key Last reconciled key.
   */
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

  /**
   * Records up to which key the target rows of the table were pruned, or that pruning finished.
   * @param runner Connection to the target shard.
   * @param moveId Move whose progress is recorded.
   * @param table Table being pruned.
   * @param key Last target key checked against the source; `undefined` once the whole table was pruned.
   */
  async prunedUpTo(
    runner: QueryRunner,
    moveId: string,
    table: string,
    key: readonly string[] | undefined,
  ): Promise<void> {
    await runner.query(
      `INSERT INTO tenant_move_checkpoints (move_id, table_name, pruned_key, pruned, updated_at) VALUES ($1, $2, $3::jsonb, $4, now())
         ON CONFLICT (move_id, table_name) DO UPDATE SET pruned_key = EXCLUDED.pruned_key, pruned = EXCLUDED.pruned, updated_at = now()`,
      [
        moveId,
        table,
        key === undefined ? null : JSON.stringify(key),
        key === undefined,
      ],
    );
  }

  /**
   * Starts the reconciliation and the pruning of a table over, for a table that still differs after both finished.
   * @param runner Connection to the target shard.
   * @param moveId Move whose progress is reset.
   * @param table Table to start over.
   */
  async restart(
    runner: QueryRunner,
    moveId: string,
    table: string,
  ): Promise<void> {
    await runner.query(
      `UPDATE tenant_move_checkpoints SET reconciled_key = NULL, pruned_key = NULL, pruned = false, updated_at = now()
         WHERE move_id = $1 AND table_name = $2`,
      [moveId, table],
    );
  }

  /**
   * Records that a table matched the frozen source with its count and checksum.
   * @param runner Connection of the target.
   * @param moveId Move.
   * @param table Verified table.
   * @param checksum Count and checksum.
   */
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
   * @param dataSource Target shard.
   * @param moveId Move.
   * @param tables Tables of the manifest.
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
