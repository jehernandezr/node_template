import { UnroutedShardScopes } from '@platform/persistence/test-utils';
import { Permission, TenantRole } from '@contracts/identity';
import { SequentialIdGenerator } from '@platform/kernel/test-utils';
import { TenantAccessRepository } from '../../domain/access-store.js';
import type { Group } from '../../domain/group.js';
import type { Membership } from '../../domain/membership.js';
import type { Role } from '../../domain/role.js';
import { ListMembersByPermission } from '../list-members-by-permission.use-case.js';

/** Only the reads the use case makes; the rest is never called. */
class ReadOnlyTenantAccess extends TenantAccessRepository {
  constructor(
    private readonly memberships: readonly Membership[],
    private readonly groups: readonly Group[],
    private readonly roles: readonly Role[],
  ) {
    super();
  }

  override listMemberships(): Promise<readonly Membership[]> {
    return Promise.resolve(this.memberships);
  }
  override listGroups(): Promise<readonly Group[]> {
    return Promise.resolve(this.groups);
  }
  override listRoles(): Promise<readonly Role[]> {
    return Promise.resolve(this.roles);
  }
  override listMembershipsAfter(): never {
    throw new Error('not used');
  }
  override findMembership(): never {
    throw new Error('not used');
  }
  override insertMembership(): never {
    throw new Error('not used');
  }
  override updateMembership(): never {
    throw new Error('not used');
  }
  override removeMembership(): never {
    throw new Error('not used');
  }
  override removedVersion(): never {
    throw new Error('not used');
  }
  override purgeMembership(): never {
    throw new Error('not used');
  }
  override purgeTenant(): never {
    throw new Error('not used');
  }
  override insertGroup(): never {
    throw new Error('not used');
  }
  override updateGroup(): never {
    throw new Error('not used');
  }
  override deleteGroup(): never {
    throw new Error('not used');
  }
  override insertRole(): never {
    throw new Error('not used');
  }
  override updateRole(): never {
    throw new Error('not used');
  }
  override deleteRole(): never {
    throw new Error('not used');
  }
  override tenantVersion(): never {
    throw new Error('not used');
  }
  override bumpTenantVersion(): never {
    throw new Error('not used');
  }

  override lockForChanges(): never {
    throw new Error('not used');
  }
}

describe('ListMembersByPermission', () => {
  const ids = new SequentialIdGenerator();
  const tenantId = ids.next().toString();
  const managers: Role = {
    id: ids.next().toString(),
    tenantId,
    name: 'Admin',
    systemRole: TenantRole.Admin,
    permissions: [Permission.IdentityTenantManage],
  };
  const readers: Role = {
    id: ids.next().toString(),
    tenantId,
    name: 'Readers',
    systemRole: null,
    permissions: [Permission.IdentityMembersRead],
  };
  const admins: Group = {
    id: ids.next().toString(),
    tenantId,
    name: 'Admins',
    systemRole: TenantRole.Admin,
    roleIds: [managers.id],
  };
  const reading: Group = {
    id: ids.next().toString(),
    tenantId,
    name: 'Read',
    systemRole: null,
    roleIds: [readers.id],
  };
  const member = (groupIds: readonly string[]): Membership => ({
    id: ids.next().toString(),
    tenantId,
    userId: ids.next().toString(),
    homeTenantId: tenantId,
    groupIds,
    permissionVersion: 1,
    joinedAt: new Date('2026-01-01T00:00:00.000Z'),
    leavingSince: null,
  });
  const first = member([admins.id]);
  const reader = member([reading.id]);
  const second = member([admins.id, reading.id]);
  const third = member([admins.id]);

  const useCase = new ListMembersByPermission(
    new ReadOnlyTenantAccess(
      [third, reader, first, second],
      [admins, reading],
      [managers, readers],
    ),
    UnroutedShardScopes.create(),
  );
  const refOf = (membership: Membership): object => ({
    userId: membership.userId,
    homeTenantId: membership.homeTenantId,
  });

  it('returns only the members whose roles grant the permission, ordered by user', async () => {
    const page = await useCase.execute({
      tenantId,
      permission: Permission.IdentityTenantManage,
    });

    expect(page).toEqual({
      items: [refOf(first), refOf(second), refOf(third)],
      nextCursor: null,
    });
  });

  it('pages with the last user id as cursor', async () => {
    const firstPage = await useCase.execute({
      tenantId,
      permission: Permission.IdentityTenantManage,
      limit: 2,
    });
    const nextPage = await useCase.execute({
      tenantId,
      permission: Permission.IdentityTenantManage,
      limit: 2,
      after: firstPage.nextCursor ?? '',
    });

    expect(firstPage).toEqual({
      items: [refOf(first), refOf(second)],
      nextCursor: second.userId,
    });
    expect(nextPage).toEqual({ items: [refOf(third)], nextCursor: null });
  });

  it('returns an empty page when nobody holds the permission', async () => {
    const page = await useCase.execute({
      tenantId,
      permission: Permission.BillingWrite,
    });

    expect(page).toEqual({ items: [], nextCursor: null });
  });
});
