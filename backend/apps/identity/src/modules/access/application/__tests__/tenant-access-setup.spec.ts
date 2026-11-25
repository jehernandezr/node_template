import { IdentityErrorCode, TenantRole } from '@contracts/identity';
import { InMemoryAuthState } from '@platform/auth/test-utils';
import { FixedClock, SequentialIdGenerator } from '@platform/kernel/test-utils';
import { InMemoryTransactionManager } from '@platform/messaging/test-utils';
import {
  RecordingMessageBus,
  TestShardScopes,
} from '../../../../__tests__/utils/index.js';
import {
  InMemoryTenantAccessRepository,
  InMemoryUserAccessRepository,
} from '../../__tests__/utils/index.js';
import { AccessVersionPublisher } from '../access-version-publisher.js';
import { TenantAccessSetup } from '../tenant-access-setup.js';

const TENANT = '01930000-0000-7000-8000-0000000000aa';
const ANA = { userId: 'user-ana', homeTenantId: TENANT };
const DANI = { userId: 'user-dani', homeTenantId: TENANT };
const OWNERS = 'group-owners';
const MEMBERS = 'group-members';

/** A tenant whose only member is its owner Ana, and the setup that adds members to it. */
class TenantWithSoleOwner {
  readonly tenantAccess = new InMemoryTenantAccessRepository();
  readonly clock = new FixedClock(new Date('2026-11-25T10:00:00.000Z'));
  readonly setup: TenantAccessSetup;

  constructor() {
    const transactions = new InMemoryTransactionManager();
    const bus = new RecordingMessageBus();
    this.setup = new TenantAccessSetup(
      this.tenantAccess,
      new InMemoryUserAccessRepository(),
      new AccessVersionPublisher(
        bus,
        new InMemoryAuthState(),
        transactions,
        this.clock,
      ),
      TestShardScopes.create(),
      transactions,
      bus,
      new SequentialIdGenerator(),
      this.clock,
    );
  }

  /**
   * Creates the owners and members groups and makes Ana the owner.
   * @returns The fixture.
   */
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
    return this;
  }

  /**
   * Marks Ana as leaving, as a deletion of her account would.
   * @returns The fixture.
   */
  async ownerLeaves(): Promise<this> {
    const ana = await this.tenantAccess.findMembership(ANA.userId);
    if (ana !== undefined) {
      await this.tenantAccess.updateMembership({
        ...ana,
        leavingSince: this.clock.now(),
      });
    }
    return this;
  }
}

describe('TenantAccessSetup', () => {
  describe('adding a member', () => {
    it('refuses a member while the only owner is leaving, so the erasure of the owner is not stranded', async () => {
      const tenant = await (
        await new TenantWithSoleOwner().build()
      ).ownerLeaves();

      await expect(
        tenant.setup.addMember(TENANT, DANI, [MEMBERS]),
      ).rejects.toMatchObject({ code: IdentityErrorCode.InvitationInvalid });
      expect(await tenant.tenantAccess.findMembership(DANI.userId)).toBe(
        undefined,
      );
    });

    it('lets someone join as an owner while the only owner is leaving', async () => {
      const tenant = await (
        await new TenantWithSoleOwner().build()
      ).ownerLeaves();

      await tenant.setup.addMember(TENANT, DANI, [OWNERS]);

      expect(await tenant.tenantAccess.findMembership(DANI.userId)).toEqual(
        expect.objectContaining({ groupIds: [OWNERS] }),
      );
    });

    it('adds a member while the owner stays', async () => {
      const tenant = await new TenantWithSoleOwner().build();

      await tenant.setup.addMember(TENANT, DANI, [MEMBERS]);

      expect(await tenant.tenantAccess.findMembership(DANI.userId)).toEqual(
        expect.objectContaining({ groupIds: [MEMBERS] }),
      );
    });
  });
});
