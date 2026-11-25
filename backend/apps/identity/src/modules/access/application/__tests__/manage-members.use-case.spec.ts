import {
  IdentityErrorCode,
  IdentityEvent,
  MembershipChangeKind,
  TenantRole,
} from '@contracts/identity';
import { InMemoryAuthState } from '@platform/auth/test-utils';
import { FlagEvaluator, InMemoryFlagStore } from '@platform/flags';
import { FixedClock, SequentialIdGenerator } from '@platform/kernel/test-utils';
import { InMemoryTransactionManager } from '@platform/messaging/test-utils';
import {
  RecordingMessageBus,
  TestShardScopes,
} from '../../../../__tests__/utils/index.js';
import {
  InMemoryTenantsFacade,
  PlanEntitlementsProvider,
} from '../../../tenants/__tests__/utils/index.js';
import {
  InMemoryTenantAccessRepository,
  InMemoryUserAccessRepository,
} from '../../__tests__/utils/index.js';
import { SystemRolePermissions } from '../../../../shared/constants/system-roles.constants.js';
import { AccessResolver } from '../access-resolver.js';
import { AccessVersionPublisher } from '../access-version-publisher.js';
import { ActorPermissions } from '../actor-permissions.js';
import { GrantCeiling } from '../grant-ceiling.js';
import { ManageMembers } from '../manage-members.use-case.js';
import { TenantAccessSetup } from '../tenant-access-setup.js';

const TENANT = '01930000-0000-7000-8000-0000000000aa';
const ANA = { userId: 'user-ana', homeTenantId: TENANT };
const BEA = { userId: 'user-bea', homeTenantId: TENANT };
const CARLA = { userId: 'user-carla', homeTenantId: TENANT };
const OWNERS = 'group-owners';
const MEMBERS = 'group-members';

/** A tenant with owners Ana and Bea and member Carla, and the use case over it. */
class TenantWithTwoOwners {
  readonly tenantAccess = new InMemoryTenantAccessRepository();
  readonly bus = new RecordingMessageBus();
  readonly clock = new FixedClock(new Date('2026-11-25T10:00:00.000Z'));
  readonly members: ManageMembers;
  private readonly setup: TenantAccessSetup;

  constructor() {
    const scopes = TestShardScopes.create();
    const transactions = new InMemoryTransactionManager();
    const userAccess = new InMemoryUserAccessRepository();
    const versions = new AccessVersionPublisher(
      this.bus,
      new InMemoryAuthState(),
      transactions,
      this.clock,
    );
    this.setup = new TenantAccessSetup(
      this.tenantAccess,
      userAccess,
      versions,
      scopes,
      transactions,
      this.bus,
      new SequentialIdGenerator(),
      this.clock,
    );
    const resolver = new AccessResolver(
      this.tenantAccess,
      userAccess,
      new InMemoryTenantsFacade(),
      new PlanEntitlementsProvider(),
      scopes,
      new FlagEvaluator(new InMemoryFlagStore()),
    );
    this.members = new ManageMembers(
      this.tenantAccess,
      this.setup,
      new GrantCeiling(
        new ActorPermissions(resolver),
        this.tenantAccess,
        scopes,
      ),
      versions,
      scopes,
      transactions,
      this.bus,
      this.clock,
    );
  }

  async build(): Promise<this> {
    await this.tenantAccess.insertGroup({
      id: OWNERS,
      tenantId: TENANT,
      name: 'Owners',
      systemRole: TenantRole.Owner,
      roleIds: [],
    });
    await this.tenantAccess.insertGroup({
      id: MEMBERS,
      tenantId: TENANT,
      name: 'Members',
      systemRole: TenantRole.Member,
      roleIds: [],
    });
    await this.setup.addMember(TENANT, ANA, [OWNERS]);
    await this.setup.addMember(TENANT, BEA, [OWNERS]);
    await this.setup.addMember(TENANT, CARLA, [MEMBERS]);
    return this;
  }

  async leavingSince(userId: string): Promise<Date | null | undefined> {
    return (await this.tenantAccess.findMembership(userId))?.leavingSince;
  }
}

describe('ManageMembers', () => {
  describe('reserving a departure', () => {
    it('marks the owner as leaving while another owner stays', async () => {
      const tenant = await new TenantWithTwoOwners().build();

      await tenant.members.reserveDeparture(TENANT, ANA.userId);

      expect(await tenant.leavingSince(ANA.userId)).toEqual(tenant.clock.now());
    });

    it('tells whether this call is the one that reserved the departure', async () => {
      const tenant = await new TenantWithTwoOwners().build();

      const first = await tenant.members.reserveDeparture(TENANT, ANA.userId);
      const repeated = await tenant.members.reserveDeparture(
        TENANT,
        ANA.userId,
      );

      expect([first, repeated]).toEqual([true, false]);
    });

    it('refuses the second owner once the first one is leaving', async () => {
      const tenant = await new TenantWithTwoOwners().build();
      await tenant.members.reserveDeparture(TENANT, ANA.userId);

      await expect(
        tenant.members.reserveDeparture(TENANT, BEA.userId),
      ).rejects.toMatchObject({ code: IdentityErrorCode.AccessLastOwner });
      expect(await tenant.leavingSince(BEA.userId)).toBeNull();
    });

    it('lets the second owner leave once the first departure is cancelled', async () => {
      const tenant = await new TenantWithTwoOwners().build();
      await tenant.members.reserveDeparture(TENANT, ANA.userId);
      await tenant.members.cancelDeparture(TENANT, ANA.userId);

      await tenant.members.reserveDeparture(TENANT, BEA.userId);

      expect(await tenant.leavingSince(ANA.userId)).toBeNull();
    });
  });

  describe('removing an erased user', () => {
    it('removes a leaving owner while another owner stays and announces it', async () => {
      const tenant = await new TenantWithTwoOwners().build();
      await tenant.members.reserveDeparture(TENANT, ANA.userId);

      await tenant.members.removeErased(TENANT, ANA);

      expect(await tenant.tenantAccess.findMembership(ANA.userId)).toBe(
        undefined,
      );
      expect(tenant.bus.published).toContainEqual({
        type: IdentityEvent.MembershipChanged,
        data: expect.objectContaining({
          userId: ANA.userId,
          kind: MembershipChangeKind.Removed,
        }),
        tenantId: TENANT,
      });
    });

    it('refuses to remove the last owner who stays while other members remain', async () => {
      const tenant = await new TenantWithTwoOwners().build();
      await tenant.members.reserveDeparture(TENANT, BEA.userId);

      await expect(
        tenant.members.removeErased(TENANT, ANA),
      ).rejects.toMatchObject({ code: IdentityErrorCode.AccessLastOwner });
      expect(await tenant.tenantAccess.findMembership(ANA.userId)).toEqual(
        expect.objectContaining({ userId: ANA.userId }),
      );
    });
  });

  describe('changing groups', () => {
    it('refuses to demote the only owner who is not leaving', async () => {
      const tenant = await new TenantWithTwoOwners().build();
      await tenant.members.reserveDeparture(TENANT, ANA.userId);

      await expect(
        tenant.members.setGroups(
          TENANT,
          BEA.userId,
          [MEMBERS],
          SystemRolePermissions[TenantRole.Owner],
        ),
      ).rejects.toMatchObject({ code: IdentityErrorCode.AccessLastOwner });
    });
  });
});
