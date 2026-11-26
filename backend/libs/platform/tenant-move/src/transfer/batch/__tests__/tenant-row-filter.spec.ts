import { TenantMoveErrorCode } from '../../../errors/tenant-move-error-code.enum.js';
import { TenantMoveManifest } from '../../../manifest/tenant-move-manifest.js';
import { TenantMoveSelectorKind } from '../../../manifest/tenant-move-selector-kind.enum.js';
import type { TenantMoveTable } from '../../../manifest/tenant-move-table.js';
import { TenantRowFilter } from '../tenant-row-filter.js';

class FixedManifest extends TenantMoveManifest {
  constructor(private readonly entries: readonly TenantMoveTable[]) {
    super();
  }

  override tables(): readonly TenantMoveTable[] {
    return this.entries;
  }
}

const users: TenantMoveTable = {
  table: 'users',
  selector: {
    kind: TenantMoveSelectorKind.TenantColumn,
    column: 'home_tenant_id',
  },
};
const devices: TenantMoveTable = {
  table: 'devices',
  selector: {
    kind: TenantMoveSelectorKind.ViaParent,
    parent: 'users',
    column: 'user_id',
    parentColumn: 'id',
  },
};
const keys: TenantMoveTable = {
  table: 'device_keys',
  selector: {
    kind: TenantMoveSelectorKind.ViaParent,
    parent: 'devices',
    column: 'device_id',
    parentColumn: 'id',
  },
};

describe('TenantRowFilter', () => {
  const filter = new TenantRowFilter(new FixedManifest([users, devices, keys]));

  it('chooses the rows of a table by its own tenant column', () => {
    expect(filter.where('users', 't')).toBe('t."home_tenant_id"::text = $1');
  });

  it('reaches the rows of a grandchild through every parent up to the tenant column', () => {
    expect(filter.where('device_keys', 't')).toBe(
      't."device_id" IN (SELECT p0."id" FROM "devices" p0 WHERE p0."user_id" IN ' +
        '(SELECT p1."id" FROM "users" p1 WHERE p1."home_tenant_id"::text = $1))',
    );
  });

  it.each([
    ['a table twice', [users, users]],
    ['a child before its parent', [devices, users]],
  ])('refuses a manifest with %s', (_label, entries) => {
    expect(() => new TenantRowFilter(new FixedManifest(entries))).toThrow(
      expect.objectContaining({ code: TenantMoveErrorCode.InvalidManifest }),
    );
  });

  it('refuses a table that is not in the manifest and a name that is not a plain identifier', () => {
    expect(() => filter.where('sessions', 't')).toThrow(
      expect.objectContaining({ code: TenantMoveErrorCode.InvalidManifest }),
    );
    const unsafe = new TenantRowFilter(
      new FixedManifest([
        {
          table: 'users',
          selector: {
            kind: TenantMoveSelectorKind.TenantColumn,
            column: 'id"; drop',
          },
        },
      ]),
    );
    expect(() => unsafe.where('users', 't')).toThrow(
      expect.objectContaining({ code: TenantMoveErrorCode.InvalidManifest }),
    );
  });
});
