import { FailureKind } from '@platform/kernel';
import { FailureClassifier } from '@platform/primitives';

/**
 * Clasifica los errores del driver de Postgres. Los SQLSTATE los traduce esta
 * capa; un error de red de Node (sin SQLSTATE) lo decide el clasificador general.
 */
export class PostgresFailureClassifier {
  /**
   * SQLSTATE pasajeros de Postgres: serialización, deadlock, apagado o reinicio
   * del servidor, demasiadas conexiones y falta de memoria. Repetir la
   * transacción completa puede funcionar.
   */
  private static readonly TRANSIENT_SQLSTATES: ReadonlySet<string> = new Set([
    '40001',
    '40P01',
    '57P01',
    '57P02',
    '57P03',
    '53300',
    '53200',
  ]);

  /** Clase 08 de Postgres (excepción de conexión), cualquier subcódigo. */
  private static readonly CONNECTION_SQLSTATE = /^08[0-9A-Z]{3}$/;

  private static readonly FALLBACK = new FailureClassifier();

  static classify(error: unknown): FailureKind {
    const sqlState = PostgresFailureClassifier.sqlStateOf(error);
    if (
      sqlState !== undefined &&
      (PostgresFailureClassifier.TRANSIENT_SQLSTATES.has(sqlState) ||
        PostgresFailureClassifier.CONNECTION_SQLSTATE.test(sqlState))
    ) {
      return FailureKind.Transient;
    }
    // `EPIPE` también tiene cinco caracteres: el resto lo decide el clasificador general.
    return PostgresFailureClassifier.FALLBACK.classify(error);
  }

  /** SQLSTATE de un error de `pg`, si lo trae. Los códigos de red de Node no tienen cinco caracteres. */
  static sqlStateOf(error: unknown): string | undefined {
    const code = (error as { code?: unknown } | null)?.code;
    return typeof code === 'string' && /^[0-9A-Z]{5}$/.test(code)
      ? code
      : undefined;
  }
}
