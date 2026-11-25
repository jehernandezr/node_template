import { Compensation } from '../../enums/compensation.enum.js';
import { defineServiceContract } from '../define-service-contract.js';
import { defineTenantDirectoryOperations } from '../define-tenant-directory.js';

describe('defineTenantDirectoryOperations', () => {
  const directory = defineTenantDirectoryOperations('sample');

  it('names the two operations after the service', () => {
    expect(directory.tenantDirectoryPlace.id).toBe(
      'sample.tenant-directory.place.v1',
    );
    expect(directory.tenantDirectoryRemove.id).toBe(
      'sample.tenant-directory.remove.v1',
    );
  });

  it('reverts the placement with the removal and leaves the removal without reverse', () => {
    expect(directory.tenantDirectoryPlace.compensatedBy).toBe(
      directory.tenantDirectoryRemove.id,
    );
    expect(directory.tenantDirectoryRemove.compensatedBy).toBe(
      Compensation.None,
    );
    expect(
      directory.tenantDirectoryRemove.compensationReason?.length,
    ).toBeGreaterThan(0);
  });

  it('makes both operations idempotent so a saga can repeat them', () => {
    for (const op of Object.values(directory)) {
      expect(op.idempotent).toBe(true);
      expect(op.timeoutMs).toBeGreaterThan(0);
    }
  });

  it('accepts a placement with at least one group and rejects one without groups', () => {
    const entry = {
      tenantId: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9a01',
      region: 'eu',
      groups: ['group-0'],
      dedicated: false,
    };

    expect(directory.tenantDirectoryPlace.input.safeParse(entry).success).toBe(
      true,
    );
    expect(
      directory.tenantDirectoryPlace.input.safeParse({ ...entry, groups: [] })
        .success,
    ).toBe(false);
  });

  it('fits in a service contract', () => {
    const contract = defineServiceContract({
      service: 'sample',
      description: 'Servicio de prueba.',
      operations: { ...directory },
    });
    expect(Object.keys(contract.operations)).toEqual([
      'tenantDirectoryPlace',
      'tenantDirectoryRemove',
    ]);
  });
});
