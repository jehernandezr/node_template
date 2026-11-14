import { NoTransactionScope } from '../no-transaction-scope.js';

describe('NoTransactionScope', () => {
  it('never reports a transaction', () => {
    expect(new NoTransactionScope().isInTransaction()).toBe(false);
  });

  it('runs an after-commit effect right away', () => {
    let ran = false;

    new NoTransactionScope().afterCommit(() => {
      ran = true;
    });

    expect(ran).toBe(true);
  });
});
