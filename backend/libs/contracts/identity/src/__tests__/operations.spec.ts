import { Compensation } from '@contracts/platform';
import { identityContract } from '../contract.js';
import { IdentityOperation } from '../enums/identifiers.enum.js';

const operations = Object.values(identityContract.operations);

describe('identity internal operations', () => {
  it('uses every IdentityOperation value exactly once', () => {
    const ids = operations.map((op) => op.id);
    expect([...ids].sort()).toEqual(Object.values(IdentityOperation).sort());
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(operations.map((op) => [op.id, op] as const))(
    'makes %s idempotent',
    (_id, op) => {
      expect(op.idempotent).toBe(true);
    },
  );

  it.each(
    operations.filter((op) => op.mutating).map((op) => [op.id, op] as const),
  )('declares the compensation of %s', (_id, op) => {
    expect(op.compensatedBy).toBeDefined();
  });

  it('pairs suspend and reactivate for users and tenants', () => {
    const byId = new Map(operations.map((op) => [op.id, op]));
    const suspendUser = byId.get(IdentityOperation.SuspendUser);
    const reactivateUser = byId.get(IdentityOperation.ReactivateUser);
    const suspendTenant = byId.get(IdentityOperation.SuspendTenant);
    const reactivateTenant = byId.get(IdentityOperation.ReactivateTenant);
    expect(suspendUser?.compensatedBy).toBe(IdentityOperation.ReactivateUser);
    expect(reactivateUser?.compensatedBy).toBe(IdentityOperation.SuspendUser);
    expect(suspendTenant?.compensatedBy).toBe(
      IdentityOperation.ReactivateTenant,
    );
    expect(reactivateTenant?.compensatedBy).toBe(
      IdentityOperation.SuspendTenant,
    );
    expect(suspendUser?.errors).toEqual(['IDENTITY.USER.NOT_FOUND']);
    expect(reactivateTenant?.errors).toEqual(['IDENTITY.TENANT.NOT_FOUND']);
  });

  it('compensates the tenant creation with its discard', () => {
    const create = operations.find(
      (op) => op.id === IdentityOperation.CreateTenant,
    );
    expect(create?.compensatedBy).toBe(IdentityOperation.DiscardTenant);
    expect(create?.errors).toEqual(['IDENTITY.TENANT.SLUG_TAKEN']);
  });

  it('marks the discard as uncompensated with a reason', () => {
    const discard = operations.find(
      (op) => op.id === IdentityOperation.DiscardTenant,
    );
    expect(discard?.compensatedBy).toBe(Compensation.None);
    expect(discard?.compensationReason).toMatch(/being provisioned/);
  });

  it('keeps the read operations free of compensation', () => {
    const reads = operations.filter((op) => !op.mutating);
    expect(reads.map((op) => op.id).sort()).toEqual(
      [
        IdentityOperation.GetUserAccess,
        IdentityOperation.GetUserProfile,
        IdentityOperation.AuthenticateApiKey,
        IdentityOperation.ListPushTargets,
        IdentityOperation.ListMembersByPermission,
      ].sort(),
    );
    for (const op of reads) {
      expect(op.compensatedBy).toBeUndefined();
    }
  });
});
