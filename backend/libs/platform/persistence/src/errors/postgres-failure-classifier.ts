import { FailureKind } from '@platform/kernel';
import { FailureClassifier } from '@platform/primitives';
import type { PostgresSqlState } from './postgres-sql-state.enum.js';

/**
 * Classifies Postgres driver errors. SQLSTATEs are translated by this
 * layer; a Node network error (without SQLSTATE) is decided by the general classifier.
 */
export class PostgresFailureClassifier {
  /**
   * Transient Postgres SQLSTATEs: serialization, deadlock, server shutdown or
   * restart, too many connections and out of memory. Retrying the
   * whole transaction may work.
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

  /** Postgres class 08 (connection exception), any subcode. */
  private static readonly CONNECTION_SQLSTATE = /^08[0-9A-Z]{3}$/;

  private static readonly FALLBACK = new FailureClassifier();

  /** Transient if the SQLSTATE is; any other error, including a network code like `EPIPE`, is decided by the general classifier. */
  static classify(error: unknown): FailureKind {
    return (
      PostgresFailureClassifier.transientKindOf(error) ??
      PostgresFailureClassifier.FALLBACK.classify(error)
    );
  }

  /** `Transient` if the error carries a transient SQLSTATE; `undefined` if it says nothing about that. */
  static transientKindOf(error: unknown): FailureKind | undefined {
    const sqlState = PostgresFailureClassifier.sqlStateOf(error);
    return sqlState !== undefined &&
      (PostgresFailureClassifier.TRANSIENT_SQLSTATES.has(sqlState) ||
        PostgresFailureClassifier.CONNECTION_SQLSTATE.test(sqlState))
      ? FailureKind.Transient
      : undefined;
  }

  /** Whether the `pg` error carries exactly that SQLSTATE. */
  static hasSqlState(error: unknown, state: PostgresSqlState): boolean {
    return PostgresFailureClassifier.sqlStateOf(error) === state;
  }

  /** SQLSTATE of a `pg` error, if it has one. Node network codes are not five characters long. */
  static sqlStateOf(error: unknown): string | undefined {
    const code = (error as { code?: unknown } | null)?.code;
    return typeof code === 'string' && /^[0-9A-Z]{5}$/.test(code)
      ? code
      : undefined;
  }
}
