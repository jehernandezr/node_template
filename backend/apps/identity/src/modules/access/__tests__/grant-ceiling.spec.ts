import { FlagEvaluator, InMemoryFlagStore } from '@platform/flags';
import { TestShardScopes } from '../../../__tests__/utils/index.js';
import { Permission, TenantRole } from '@contracts/identity';
import { PlatformErrorCode } from '@contracts/platform';
import { InMemoryAuthState } from '@platform/auth/test-utils';
import { IdentityError } from '../../../shared/errors/identity.error.js';
import { MessageBus, type MessageEnvelope } from '@platform/messaging';
import { InMemoryTransactionManager } from '@platform/messaging/test-utils';
import { ActorType } from '@platform/observability';
import { FixedClock, SequentialIdGenerator } from '@platform/kernel/test-utils';
import { SystemRolePermissions } from '../../../shared/constants/system-roles.constants.js';
import {
  InMemoryTenantsFacade,
  PlanEntitlementsProvider,
} from '../../tenants/__tests__/utils/index.js';
import { InMemoryUsersFacade } from '../../users/__tests__/utils/index.js';
import {
  InMemoryTenantAccessRepository,
  InMemoryUserAccessRepository,
} from './utils/index.js';
import { AccessResolver } from '../application/access-resolver.js';
import { AccessVersionPublisher } from '../application/access-version-publisher.js';
import { ActorPermissions } from '../application/actor-permissions.js';
import { GrantCeiling } from '../application/grant-ceiling.js';
import { ManageGroups } from '../application/manage-groups.use-case.js';
import { ManageMembers } from '../application/manage-members.use-case.js';
import { ManageRoles } from '../application/manage-roles.use-case.js';
import { TenantAccessSetup } from '../application/tenant-access-setup.js';

/** Las pruebas solo cubren rechazos: si algo llega a publicar, el rechazo no ocurrió. */
class UnreachableMessageBus extends MessageBus {
  publish(): Promise<MessageEnvelope<never>> {
    throw new Error('El rechazo debía ocurrir antes de publicar');
  }
  send(): Promise<MessageEnvelope<never>> {
    throw new Error('El rechazo debía ocurrir antes de enviar');
  }
}

const TENANT = 'tenant-acme';
const ADMIN = 'user-admin';
const OWNER = 'user-owner';
const ADMIN_PERMISSIONS = SystemRolePermissions[TenantRole.Admin];

describe('GrantCeiling', () => {
  const tenantAccess = new InMemoryTenantAccessRepository();
  const scopes = TestShardScopes.create();
  const transactions = new InMemoryTransactionManager();
  const bus = new UnreachableMessageBus();
  const clock = new FixedClock();
  const ids = new SequentialIdGenerator();
  const userAccess = new InMemoryUserAccessRepository();
  const resolver = new AccessResolver(
    tenantAccess,
    userAccess,
    new InMemoryTenantsFacade(),
    new PlanEntitlementsProvider(),
    scopes,
    new FlagEvaluator(new InMemoryFlagStore()),
  );
  const ceiling = new GrantCeiling(
    new ActorPermissions(resolver),
    tenantAccess,
    scopes,
  );
  const versions = new AccessVersionPublisher(
    bus,
    new InMemoryAuthState(),
    transactions,
    clock,
  );
  const setup = new TenantAccessSetup(
    tenantAccess,
    userAccess,
    scopes,
    transactions,
    bus,
    ids,
    clock,
  );
  const members = new ManageMembers(
    tenantAccess,
    new InMemoryUsersFacade(),
    setup,
    ceiling,
    versions,
    scopes,
    transactions,
    bus,
    clock,
  );
  const groups = new ManageGroups(
    tenantAccess,
    versions,
    ceiling,
    scopes,
    transactions,
    ids,
  );
  const roles = new ManageRoles(
    tenantAccess,
    versions,
    ceiling,
    scopes,
    transactions,
    ids,
  );

  const groupOf = (role: TenantRole): string => `group-${role}`;
  const roleOf = (role: TenantRole): string => `role-${role}`;

  beforeAll(async () => {
    for (const role of Object.values(TenantRole)) {
      await tenantAccess.insertRole({
        id: roleOf(role),
        tenantId: TENANT,
        name: role,
        systemRole: role,
        permissions: SystemRolePermissions[role],
      });
      await tenantAccess.insertGroup({
        id: groupOf(role),
        tenantId: TENANT,
        name: role,
        systemRole: role,
        roleIds: [roleOf(role)],
      });
    }
    await tenantAccess.insertGroup({
      id: 'group-custom',
      tenantId: TENANT,
      name: 'Propio',
      systemRole: null,
      roleIds: [],
    });
    await tenantAccess.insertRole({
      id: 'role-custom',
      tenantId: TENANT,
      name: 'Gestión',
      systemRole: null,
      permissions: [Permission.IdentityTenantManage],
    });
    for (const [userId, role] of [
      [ADMIN, TenantRole.Admin],
      [OWNER, TenantRole.Owner],
    ] as const) {
      await tenantAccess.insertMembership({
        id: `membership-${userId}`,
        tenantId: TENANT,
        userId,
        homeTenantId: TENANT,
        groupIds: [groupOf(role)],
        permissionVersion: 1,
        joinedAt: clock.now(),
      });
    }
  });

  const forbidden = (missing: readonly Permission[]): IdentityError =>
    expect.objectContaining({
      name: IdentityError.name,
      code: PlatformErrorCode.AuthForbidden,
      details: { missing: [...missing] },
    }) as IdentityError;

  it('keeps an admin from putting herself in the owners group', async () => {
    await expect(
      members.setGroups(
        TENANT,
        ADMIN,
        [groupOf(TenantRole.Owner)],
        ADMIN_PERMISSIONS,
      ),
    ).rejects.toEqual(forbidden([Permission.IdentityTenantManage]));
  });

  it('keeps an admin from demoting or removing an owner', async () => {
    await expect(
      members.setGroups(
        TENANT,
        OWNER,
        [groupOf(TenantRole.Member)],
        ADMIN_PERMISSIONS,
      ),
    ).rejects.toEqual(forbidden([Permission.IdentityTenantManage]));
    await expect(
      members.remove(TENANT, OWNER, ADMIN_PERMISSIONS),
    ).rejects.toEqual(forbidden([Permission.IdentityTenantManage]));
  });

  it('rejects groups that do not exist in the tenant', async () => {
    await expect(
      members.setGroups(TENANT, ADMIN, ['group-ajeno'], ADMIN_PERMISSIONS),
    ).rejects.toMatchObject({ code: PlatformErrorCode.ResourceNotFound });
  });

  it('keeps an admin from giving a group the owner role or a role above her own', async () => {
    await expect(
      groups.setRoles(
        TENANT,
        'group-custom',
        [roleOf(TenantRole.Owner)],
        ADMIN_PERMISSIONS,
      ),
    ).rejects.toEqual(forbidden([Permission.IdentityTenantManage]));
    await expect(
      groups.setRoles(
        TENANT,
        'group-custom',
        ['role-ajeno'],
        ADMIN_PERMISSIONS,
      ),
    ).rejects.toMatchObject({ code: PlatformErrorCode.ResourceNotFound });
  });

  it('keeps an admin from editing or deleting a role with permissions she lacks', async () => {
    await expect(
      roles.update(
        TENANT,
        { roleId: 'role-custom', permissions: [] },
        ADMIN_PERMISSIONS,
      ),
    ).rejects.toEqual(forbidden([Permission.IdentityTenantManage]));
    await expect(
      roles.delete(TENANT, 'role-custom', ADMIN_PERMISSIONS),
    ).rejects.toEqual(forbidden([Permission.IdentityTenantManage]));
  });

  it('checks the groups of an invitation against the permissions of a service account', async () => {
    const actor = {
      kind: ActorType.ServiceAccount,
      serviceAccountId: 'sa-1',
      apiKeyId: 'key-1',
      tenantId: TENANT,
      permissions: [Permission.IdentityInvitationsManage],
    } as const;

    await expect(
      ceiling.assertActorCanGrantGroups(TENANT, actor, [
        groupOf(TenantRole.Admin),
      ]),
    ).rejects.toMatchObject({ code: PlatformErrorCode.AuthForbidden });
    await expect(
      ceiling.assertActorCanGrantGroups(TENANT, actor, ['group-custom']),
    ).resolves.toBeUndefined();
  });

  it('lets a system actor grant nothing', async () => {
    await expect(
      ceiling.assertActorCanGrantGroups(
        TENANT,
        { kind: ActorType.System, name: 'job' },
        [groupOf(TenantRole.Member)],
      ),
    ).rejects.toMatchObject({ code: PlatformErrorCode.AuthForbidden });
  });
});
