import { TenantMoveErrorCode } from '../../errors/tenant-move-error-code.enum.js';
import { TenantMoveError } from '../../errors/tenant-move.error.js';
import { TenantMoveSelectorKind } from '../../manifest/tenant-move-selector-kind.enum.js';
import type { TenantMoveManifest } from '../../manifest/tenant-move-manifest.js';
import type { TenantMoveTable } from '../../manifest/tenant-move-table.js';
import { SqlIdentifier } from './sql-identifier.js';

/**
 * Condición SQL que elige las filas del tenant en cada tabla del manifiesto. El tenant va siempre en `$1`; una
 * tabla `via-parent` sube por sus padres hasta una con columna del tenant.
 */
export class TenantRowFilter {
  private readonly tables: ReadonlyMap<string, TenantMoveTable>;

  /**
   * @throws TenantMoveError `InvalidManifest` si una tabla se repite o su padre no la precede en el manifiesto.
   */
  constructor(manifest: TenantMoveManifest) {
    const tables = new Map<string, TenantMoveTable>();
    for (const entry of manifest.tables()) {
      const selector = entry.selector;
      const parentMissing =
        selector.kind === TenantMoveSelectorKind.ViaParent &&
        !tables.has(selector.parent);
      if (tables.has(entry.table) || parentMissing) {
        throw new TenantMoveError(
          TenantMoveErrorCode.InvalidManifest,
          'Each table appears once and after its parent',
          { table: entry.table },
        );
      }
      tables.set(entry.table, entry);
    }
    this.tables = tables;
  }

  /** Condición sobre la tabla con alias `alias`. */
  where(table: string, alias: string): string {
    return this.condition(this.entry(table), alias, 0);
  }

  private condition(
    entry: TenantMoveTable,
    alias: string,
    depth: number,
  ): string {
    const selector = entry.selector;
    if (selector.kind === TenantMoveSelectorKind.TenantColumn) {
      return `${alias}.${SqlIdentifier.quote(selector.column)}::text = $1`;
    }
    const parentAlias = `p${depth}`;
    const parent = this.entry(selector.parent);
    return (
      `${alias}.${SqlIdentifier.quote(selector.column)} IN (` +
      `SELECT ${parentAlias}.${SqlIdentifier.quote(selector.parentColumn)} ` +
      `FROM ${SqlIdentifier.quoteTable(parent.table)} ${parentAlias} ` +
      `WHERE ${this.condition(parent, parentAlias, depth + 1)})`
    );
  }

  private entry(table: string): TenantMoveTable {
    const entry = this.tables.get(table);
    if (entry === undefined) {
      throw new TenantMoveError(
        TenantMoveErrorCode.InvalidManifest,
        'The table is not in the manifest',
        { table },
      );
    }
    return entry;
  }
}
