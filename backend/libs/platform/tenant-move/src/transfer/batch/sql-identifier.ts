import { TenantMoveErrorCode } from '../../errors/tenant-move-error-code.enum.js';
import { TenantMoveError } from '../../errors/tenant-move.error.js';

/** Nombres de tabla y columna que van dentro del SQL: solo identificadores simples de PostgreSQL. */
export class SqlIdentifier {
  private static readonly PATTERN = /^[a-z_][a-z0-9_]{0,62}$/;

  /** @throws TenantMoveError `InvalidManifest` si el nombre no es un identificador simple. */
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
   * Una tabla, con su esquema si lo nombra (`saga.instances`): las tablas de la plataforma no siempre viven en el
   * esquema por defecto.
   * @throws TenantMoveError `InvalidManifest` si alguna parte no es un identificador simple o sobran partes.
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
