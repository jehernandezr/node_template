import { TenantWriteGateKind } from '../tenant-write-gate-kind.enum.js';
import { tenantWritesConfigSchema } from '../tenant-writes.config.js';

describe('tenantWritesConfigSchema', () => {
  it('closes the gate in the directory and lets a write wait 5 s unless told otherwise', () => {
    expect(tenantWritesConfigSchema.parse({})).toEqual({
      TENANT_WRITE_GATE: TenantWriteGateKind.Directory,
      TENANT_MOVE_MAX_WAIT_MS: 5_000,
    });
    expect(
      tenantWritesConfigSchema.parse({
        TENANT_WRITE_GATE: 'valkey',
        TENANT_MOVE_MAX_WAIT_MS: '250',
      }),
    ).toEqual({
      TENANT_WRITE_GATE: TenantWriteGateKind.Valkey,
      TENANT_MOVE_MAX_WAIT_MS: 250,
    });
  });

  it('refuses an unknown gate and a wait out of range', () => {
    expect(
      tenantWritesConfigSchema.safeParse({ TENANT_WRITE_GATE: 'etcd' }).success,
    ).toBe(false);
    expect(
      tenantWritesConfigSchema.safeParse({ TENANT_MOVE_MAX_WAIT_MS: '120000' })
        .success,
    ).toBe(false);
  });
});
