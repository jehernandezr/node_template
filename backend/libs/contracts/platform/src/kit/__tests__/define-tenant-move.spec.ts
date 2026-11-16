import { Compensation } from '../../enums/compensation.enum.js';
import { defineTenantMoveOperations } from '../define-tenant-move.js';
import { defineServiceContract } from '../define-service-contract.js';

describe('defineTenantMoveOperations', () => {
  const moves = defineTenantMoveOperations('sample');

  it('names the four operations after the service', () => {
    expect(moves.tenantMoveSync.id).toBe('sample.tenant-move.sync.v1');
    expect(moves.tenantMoveFinalize.id).toBe('sample.tenant-move.finalize.v1');
    expect(moves.tenantMoveAbort.id).toBe('sample.tenant-move.abort.v1');
    expect(moves.tenantMoveCleanup.id).toBe('sample.tenant-move.cleanup.v1');
  });

  it('reverts the copy with the abort and leaves the abort and the cleanup without reverse', () => {
    expect(moves.tenantMoveSync.compensatedBy).toBe(moves.tenantMoveAbort.id);
    expect(moves.tenantMoveFinalize.compensatedBy).toBe(
      moves.tenantMoveAbort.id,
    );
    for (const op of [moves.tenantMoveAbort, moves.tenantMoveCleanup]) {
      expect(op.compensatedBy).toBe(Compensation.None);
      expect(op.compensationReason?.length).toBeGreaterThan(0);
    }
  });

  it('makes every operation idempotent so a saga can repeat it', () => {
    for (const op of Object.values(moves)) {
      expect(op.idempotent).toBe(true);
      expect(op.timeoutMs).toBeGreaterThan(0);
    }
  });

  it('fits in a service contract', () => {
    const contract = defineServiceContract({
      service: 'sample',
      description: 'Servicio de prueba.',
      operations: { ...moves },
    });
    expect(Object.keys(contract.operations)).toEqual([
      'tenantMoveSync',
      'tenantMoveFinalize',
      'tenantMoveAbort',
      'tenantMoveCleanup',
    ]);
  });
});
