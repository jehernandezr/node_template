import { FailureKind } from '@platform/kernel';
import { PostgresFailureClassifier } from '../postgres-failure-classifier.js';
import { PostgresSqlState } from '../postgres-sql-state.enum.js';

describe('PostgresFailureClassifier', () => {
  it.each([
    ['40001', FailureKind.Transient],
    ['40P01', FailureKind.Transient],
    ['08006', FailureKind.Transient],
    ['23505', FailureKind.Permanent],
  ])('classifies SQLSTATE %s', (sqlState, kind) => {
    const error = Object.assign(new Error('driver text'), { code: sqlState });
    expect(PostgresFailureClassifier.classify(error)).toBe(kind);
  });

  it.each(['ECONNRESET', 'EPIPE'])(
    'treats the Node network error %s as transient',
    (code) => {
      const error = Object.assign(new Error('socket'), { code });
      expect(PostgresFailureClassifier.classify(error)).toBe(
        FailureKind.Transient,
      );
    },
  );

  it('reads the SQLSTATE of an error with five-character codes only', () => {
    expect(
      PostgresFailureClassifier.sqlStateOf(
        Object.assign(new Error('x'), { code: '40001' }),
      ),
    ).toBe('40001');
    expect(
      PostgresFailureClassifier.sqlStateOf(
        Object.assign(new Error('x'), { code: 'ECONNRESET' }),
      ),
    ).toBeUndefined();
    expect(PostgresFailureClassifier.sqlStateOf(null)).toBeUndefined();
    expect(PostgresFailureClassifier.sqlStateOf('40001')).toBeUndefined();
  });

  it('tells a unique violation apart from other SQLSTATEs', () => {
    const duplicate = Object.assign(new Error('x'), { code: '23505' });

    expect(
      PostgresFailureClassifier.hasSqlState(
        duplicate,
        PostgresSqlState.UniqueViolation,
      ),
    ).toBe(true);
    expect(
      PostgresFailureClassifier.hasSqlState(
        duplicate,
        PostgresSqlState.ForeignKeyViolation,
      ),
    ).toBe(false);
  });
});
