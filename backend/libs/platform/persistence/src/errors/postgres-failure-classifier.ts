import { FailureKind } from '@platform/kernel';
import { FailureClassifier } from '@platform/primitives';
import type { PostgresSqlState } from './postgres-sql-state.enum.js';

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
    // `EPIPE` también tiene cinco caracteres: el resto lo decide el clasificador general.
    return (
      PostgresFailureClassifier.transientKindOf(error) ??
      PostgresFailureClassifier.FALLBACK.classify(error)
    );
  }

  /** `Transient` si el error trae un SQLSTATE pasajero; `undefined` si no dice nada de eso. */
  static transientKindOf(error: unknown): FailureKind | undefined {
    const sqlState = PostgresFailureClassifier.sqlStateOf(error);
    return sqlState !== undefined &&
      (PostgresFailureClassifier.TRANSIENT_SQLSTATES.has(sqlState) ||
        PostgresFailureClassifier.CONNECTION_SQLSTATE.test(sqlState))
      ? FailureKind.Transient
      : undefined;
  }

  static hasSqlState(error: unknown, state: PostgresSqlState): boolean {
    return PostgresFailureClassifier.sqlStateOf(error) === state;
  }

  /** SQLSTATE de un error de `pg`, si lo trae. Los códigos de red de Node no tienen cinco caracteres. */
  static sqlStateOf(error: unknown): string | undefined {
    const code = (error as { code?: unknown } | null)?.code;
    return typeof code === 'string' && /^[0-9A-Z]{5}$/.test(code)
      ? code
      : undefined;
  }
}
