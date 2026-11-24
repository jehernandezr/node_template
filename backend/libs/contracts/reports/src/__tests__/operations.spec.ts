import { Compensation, validateContract } from '@contracts/platform';
import { reportsContract } from '../contract.js';
import { ReportsOperation } from '../enums/identifiers.enum.js';
import { Ids, UuidV4 } from './utils/fixtures.js';

const operations = Object.values(reportsContract.operations);

describe('reports internal operations', () => {
  it('uses every ReportsOperation value exactly once', () => {
    const ids = operations.map((op) => op.id);
    expect([...ids].sort()).toEqual(Object.values(ReportsOperation).sort());
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(operations.map((op) => [op.id, op] as const))(
    'makes %s idempotent',
    (_id, op) => {
      expect(op.idempotent).toBe(true);
    },
  );

  it('leaves the erasure and the abort and cleanup of a move without compensation', () => {
    const uncompensated = [
      reportsContract.operations.eraseUserData,
      reportsContract.operations.tenantMoveAbort,
      reportsContract.operations.tenantMoveSwitch,
      reportsContract.operations.tenantMoveCleanup,
    ];
    for (const op of uncompensated) {
      expect(op.compensatedBy).toBe(Compensation.None);
      expect(op.compensationReason?.trim().length).toBeGreaterThan(0);
    }
  });

  it('compensates the sync and the finalize of a move with the abort', () => {
    expect(reportsContract.operations.tenantMoveSync.compensatedBy).toBe(
      ReportsOperation.TenantMoveAbort,
    );
    expect(reportsContract.operations.tenantMoveFinalize.compensatedBy).toBe(
      ReportsOperation.TenantMoveAbort,
    );
  });

  it('accepts a valid erasure input and rejects an invalid one', () => {
    const { input } = reportsContract.operations.eraseUserData;
    const user = { userId: Ids.user, homeTenantId: Ids.tenant };
    expect(validateContract(input, { user }).ok).toBe(true);
    expect(validateContract(input, {}).ok).toBe(false);
    expect(
      validateContract(input, { user: { ...user, userId: UuidV4 } }).ok,
    ).toBe(false);
    expect(validateContract(input, { user, extra: true }).ok).toBe(false);
  });

  it('accepts the erasure result with its affected rows', () => {
    const { output } = reportsContract.operations.eraseUserData;
    expect(
      validateContract(output, { userId: Ids.user, affectedRows: 3 }).ok,
    ).toBe(true);
    expect(
      validateContract(output, { userId: Ids.user, affectedRows: -1 }).ok,
    ).toBe(false);
  });
});
