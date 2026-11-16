import { Compensation, validateContract } from '@contracts/platform';
import { tasksContract } from '../contract.js';
import { TasksOperation } from '../enums/identifiers.enum.js';
import {
  EraseTasksUserDataOperation,
  ListTaskChangesOperation,
} from '../internal/task.operations.js';
import {
  EraseTasksUserInputSchema,
  ListTaskChangesInputSchema,
} from '../schemas/task.schema.js';
import { Ids, Now, UuidV4 } from './utils/fixtures.js';

const operations = Object.values(tasksContract.operations);

const byId = new Map(operations.map((op) => [op.id, op]));

describe('tasks internal operations', () => {
  it('uses every TasksOperation value exactly once', () => {
    const ids = operations.map((op) => op.id);
    expect([...ids].sort()).toEqual(Object.values(TasksOperation).sort());
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(operations.map((op) => [op.id, op] as const))(
    'makes %s idempotent',
    (_id, op) => {
      expect(op.idempotent).toBe(true);
    },
  );

  it('keeps the change listing free of mutation and compensation', () => {
    const list = byId.get(TasksOperation.ListChanges);
    expect(list).toBe(ListTaskChangesOperation);
    expect(list?.mutating).toBe(false);
    expect(list?.compensatedBy).toBeUndefined();
  });

  it('marks the user erasure as uncompensated with a reason', () => {
    const erase = byId.get(TasksOperation.EraseUserData);
    expect(erase).toBe(EraseTasksUserDataOperation);
    expect(erase?.compensatedBy).toBe(Compensation.None);
    expect(erase?.compensationReason?.trim().length).toBeGreaterThan(0);
  });

  it('compensates the tenant move sync and finalize with the abort', () => {
    expect(byId.get(TasksOperation.TenantMoveSync)?.compensatedBy).toBe(
      TasksOperation.TenantMoveAbort,
    );
    expect(byId.get(TasksOperation.TenantMoveFinalize)?.compensatedBy).toBe(
      TasksOperation.TenantMoveAbort,
    );
  });

  it('registers the four tenant move operations', () => {
    for (const id of [
      TasksOperation.TenantMoveSync,
      TasksOperation.TenantMoveFinalize,
      TasksOperation.TenantMoveAbort,
      TasksOperation.TenantMoveCleanup,
    ]) {
      expect(byId.has(id)).toBe(true);
    }
  });

  it('validates the change listing input', () => {
    expect(
      validateContract(ListTaskChangesInputSchema, {
        tenantId: Ids.tenant,
        updatedAfter: Now,
        limit: 50,
      }).ok,
    ).toBe(true);
    expect(
      validateContract(ListTaskChangesInputSchema, {
        tenantId: UuidV4,
      }).ok,
    ).toBe(false);
    expect(
      validateContract(ListTaskChangesInputSchema, {
        tenantId: Ids.tenant,
        updatedAfter: '13/11/2026',
      }).ok,
    ).toBe(false);
  });

  it('validates the erasure input', () => {
    const user = { userId: Ids.user, homeTenantId: Ids.tenant };
    expect(validateContract(EraseTasksUserInputSchema, { user }).ok).toBe(true);
    expect(
      validateContract(EraseTasksUserInputSchema, {
        user: { userId: Ids.user },
      }).ok,
    ).toBe(false);
    expect(
      validateContract(EraseTasksUserInputSchema, { user, extra: 1 }).ok,
    ).toBe(false);
  });
});
