import { TenantMoveErrorCode } from '../../errors/tenant-move-error-code.enum.js';
import { TenantMoveError } from '../../errors/tenant-move.error.js';

/** Table and column names that go inside the SQL: only simple PostgreSQL identifiers. */
export class SqlIdentifier {
  private static readonly PATTERN = /^[a-z_][a-z0-9_]{0,62}$/;

  /**
   * Quotes a simple SQL identifier.
   * @param name Identifier.
   * @returns The quoted identifier.
   * @throws TenantMoveError `InvalidManifest` if the name is not a simple identifier.
   */
  static quote(name: string): string {
    if (!SqlIdentifier.PATTERN.test(name)) {
      throw new TenantMoveError(
        TenantMoveErrorCode.InvalidManifest,
        'Not a plain PostgreSQL identifier',
        { name },
      );
    }
    return `"${name}"`;
  }

  /**
   * A table, with its schema if it names one (`saga.instances`): the platform tables do not always live in the
   * default schema.
   * @param name Table, optionally with its schema.
   * @returns The quoted table.
   * @throws TenantMoveError `InvalidManifest` if any part is not a simple identifier or there are extra parts.
   */
  static quoteTable(name: string): string {
    const parts = name.split('.');
    if (parts.length > 2) {
      throw new TenantMoveError(
        TenantMoveErrorCode.InvalidManifest,
        'A table is named as table or schema.table',
        { name },
      );
    }
    return parts.map((part) => SqlIdentifier.quote(part)).join('.');
  }
}
