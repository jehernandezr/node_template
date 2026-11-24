import { TenantMoveErrorCode } from '../../../errors/tenant-move-error-code.enum.js';
import { SqlIdentifier } from '../sql-identifier.js';

describe('SqlIdentifier', () => {
  it('quotes a table with or without its schema', () => {
    expect(SqlIdentifier.quoteTable('ledgers')).toBe('"ledgers"');
    expect(SqlIdentifier.quoteTable('saga.instances')).toBe(
      '"saga"."instances"',
    );
  });

  it.each(['saga.instances.extra', 'Saga.instances', 'ledgers;drop', '.x'])(
    'refuses %s as a table name',
    (name) => {
      expect(() => SqlIdentifier.quoteTable(name)).toThrow(
        expect.objectContaining({ code: TenantMoveErrorCode.InvalidManifest }),
      );
    },
  );
});
