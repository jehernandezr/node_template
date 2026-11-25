import type { FailureKind } from '@platform/kernel';
import { FailureRule } from '@platform/primitives';
import { PostgresFailureClassifier } from './postgres-failure-classifier.js';

/**
 * `FailureClassifier` rule for Postgres driver errors: a transient SQLSTATE (serialization, deadlock,
 * restart or dropped connection) is retried. Without it a `QueryFailedError` is permanent and a database failover
 * sends to the error queue what could have been retried.
 */
export class PostgresFailureRule extends FailureRule {
  /**
   * Classifies a driver error by its SQLSTATE.
   * @param error Error to classify.
   * @returns The transient failure kind, or `undefined` so the other rules decide.
   */
  classify(error: object): FailureKind | undefined {
    return PostgresFailureClassifier.transientKindOf(error);
  }
}
