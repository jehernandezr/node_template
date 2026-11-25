import { FailureKind } from '@platform/kernel';
import { QueryFailedError } from 'typeorm';
import { PlatformFailureClassifier } from '../platform-failure-classifier.js';

const queryFailed = (sqlState: string): QueryFailedError =>
  new QueryFailedError(
    'UPDATE invoices SET status = $1',
    [],
    Object.assign(new Error('terminating connection'), { code: sqlState }),
  );

describe('PlatformFailureClassifier', () => {
  const classifier = new PlatformFailureClassifier();

  it.each(['57P01', '08006', '40001', '40P01'])(
    'retries a query that failed with SQLSTATE %s, as during a database failover',
    (sqlState) => {
      expect(classifier.classify(queryFailed(sqlState))).toBe(
        FailureKind.Transient,
      );
    },
  );

  it('keeps a constraint violation permanent', () => {
    expect(classifier.classify(queryFailed('23505'))).toBe(
      FailureKind.Permanent,
    );
  });

  it('retries a throttled AWS call', () => {
    const throttled = Object.assign(new Error('Rate exceeded'), {
      name: 'ThrottlingException',
      $fault: 'client',
      $retryable: { throttling: true },
      $metadata: { httpStatusCode: 400 },
    });

    expect(classifier.classify(throttled)).toBe(FailureKind.Transient);
  });
});
