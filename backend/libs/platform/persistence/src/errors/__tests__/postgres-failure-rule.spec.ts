import { FailureKind } from '@platform/kernel';
import { FailureClassifier } from '@platform/primitives';
import { QueryFailedError } from 'typeorm';
import { PostgresFailureRule } from '../postgres-failure-rule.js';

/** A `pg` error as TypeORM delivers it: the SQLSTATE travels in `code`. */
const queryFailed = (sqlState: string): QueryFailedError =>
  new QueryFailedError(
    'SELECT 1',
    [],
    Object.assign(new Error('terminating connection'), { code: sqlState }),
  );

describe('PostgresFailureRule', () => {
  const classifier = new FailureClassifier([new PostgresFailureRule()]);

  it.each(['57P01', '40001', '08006'])(
    'makes a query that failed with SQLSTATE %s retryable for the general classifier',
    (sqlState) => {
      expect(classifier.classify(queryFailed(sqlState))).toBe(
        FailureKind.Transient,
      );
    },
  );

  it('leaves a constraint violation permanent', () => {
    expect(classifier.classify(queryFailed('23505'))).toBe(
      FailureKind.Permanent,
    );
  });

  it('is what turns a failover into a retry: without it the same error is permanent', () => {
    expect(new FailureClassifier().classify(queryFailed('57P01'))).toBe(
      FailureKind.Permanent,
    );
  });
});
