import { IdentityErrorCode, TenantRole } from '@contracts/identity';
import type { Group } from '../group.js';
import type { Membership } from '../membership.js';
import { TenantOwnership } from '../tenant-ownership.js';

const OWNERS = 'group-owners';
const MEMBERS = 'group-members';
const GROUPS: readonly Group[] = [
  {
    id: OWNERS,
    tenantId: 'tenant-acme',
    name: 'Owners',
    systemRole: TenantRole.Owner,
    roleIds: [],
  },
  {
    id: MEMBERS,
    tenantId: 'tenant-acme',
    name: 'Members',
    systemRole: TenantRole.Member,
    roleIds: [],
  },
];

/** Memberships of the tenant with the groups and departure each test needs. */
class MembershipBuilder {
  static of(
    userId: string,
    groupId: string,
    leavingSince: Date | null = null,
  ): Membership {
    return {
      id: `membership-${userId}`,
      tenantId: 'tenant-acme',
      userId,
      homeTenantId: 'tenant-acme',
      groupIds: [groupId],
      permissionVersion: 1,
      joinedAt: new Date('2026-11-01T00:00:00.000Z'),
      leavingSince,
    };
  }
}

const LEAVING = new Date('2026-11-25T10:00:00.000Z');

describe('TenantOwnership', () => {
  const ownership = new TenantOwnership(GROUPS);

  describe('a member who leaves', () => {
    it('lets an owner leave while another owner stays', () => {
      const ana = MembershipBuilder.of('ana', OWNERS);
      const memberships = [
        ana,
        MembershipBuilder.of('bea', OWNERS),
        MembershipBuilder.of('carla', MEMBERS),
      ];

      expect(() => ownership.assertCanLeave(ana, memberships)).not.toThrow();
    });

    it('refuses the last owner while other members stay', () => {
      const ana = MembershipBuilder.of('ana', OWNERS);
      const memberships = [ana, MembershipBuilder.of('carla', MEMBERS)];

      expect(() => ownership.assertCanLeave(ana, memberships)).toThrow(
        expect.objectContaining({ code: IdentityErrorCode.AccessLastOwner }),
      );
    });

    it('refuses an owner whose only fellow owner is already leaving', () => {
      const bea = MembershipBuilder.of('bea', OWNERS);
      const memberships = [
        MembershipBuilder.of('ana', OWNERS, LEAVING),
        bea,
        MembershipBuilder.of('carla', MEMBERS),
      ];

      expect(() => ownership.assertCanLeave(bea, memberships)).toThrow(
        expect.objectContaining({ code: IdentityErrorCode.AccessLastOwner }),
      );
    });

    it('lets the owner leave when nobody else is a member', () => {
      const ana = MembershipBuilder.of('ana', OWNERS);

      expect(() => ownership.assertCanLeave(ana, [ana])).not.toThrow();
    });

    it('counts a member who is leaving as someone who still needs an owner', () => {
      const ana = MembershipBuilder.of('ana', OWNERS);
      const memberships = [
        ana,
        MembershipBuilder.of('carla', MEMBERS, LEAVING),
      ];

      expect(() => ownership.assertCanLeave(ana, memberships)).toThrow(
        expect.objectContaining({ code: IdentityErrorCode.AccessLastOwner }),
      );
    });

    it('lets a member who is not an owner leave', () => {
      const carla = MembershipBuilder.of('carla', MEMBERS);
      const memberships = [MembershipBuilder.of('ana', OWNERS), carla];

      expect(() => ownership.assertCanLeave(carla, memberships)).not.toThrow();
    });
  });

  describe('a change of groups', () => {
    it('refuses to demote the only owner who is not leaving', () => {
      const bea = MembershipBuilder.of('bea', OWNERS);
      const memberships = [MembershipBuilder.of('ana', OWNERS, LEAVING), bea];

      expect(() =>
        ownership.assertOwnerRemains(bea, [MEMBERS], memberships),
      ).toThrow(
        expect.objectContaining({ code: IdentityErrorCode.AccessLastOwner }),
      );
    });

    it('lets an owner be removed while another owner stays', () => {
      const ana = MembershipBuilder.of('ana', OWNERS);
      const memberships = [ana, MembershipBuilder.of('bea', OWNERS)];

      expect(() =>
        ownership.assertOwnerRemains(ana, [], memberships),
      ).not.toThrow();
    });
  });
});
